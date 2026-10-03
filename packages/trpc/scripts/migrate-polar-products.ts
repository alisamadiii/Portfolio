/**
 * One-off Polar -> Stripe PRODUCT migration (Motion, agency, template, …).
 *
 * For every Polar product:
 *  - creates the Stripe product + price (dedup on metadata.polarProductId),
 *    carrying name/description/metadata (incl. `project`) and archived state
 *  - re-points the DB mirror row to the Stripe ids (id + stripe_price_id)
 *  - remaps orders.product_id / subscription.product_id references so
 *    purchase history and access checks keep joining to the same product
 *
 * Idempotent: re-running finds the Stripe product by polarProductId and only
 * fills whatever is missing. Orders themselves stay DB-only ($0 history).
 *
 * Run from the repo root:
 *   npx tsx packages/trpc/scripts/migrate-polar-products.ts            # dry run
 *   npx tsx packages/trpc/scripts/migrate-polar-products.ts --commit   # real run
 *
 * Env from apps/api/.env (STRIPE_SECRET_KEY, POLAR_ACCESS_TOKEN, DATABASE_URL).
 * POLAR_SERVER must match the token (pass POLAR_SERVER=production if the env
 * file still says sandbox).
 */

import * as path from "path";
import { Polar } from "@polar-sh/sdk";
import type { Product as PolarProduct } from "@polar-sh/sdk/models/components/product.js";
import * as dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env.local") });

const COMMIT = process.argv.includes("--commit");

for (const key of ["STRIPE_SECRET_KEY", "POLAR_ACCESS_TOKEN", "DATABASE_URL"]) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in apps/api/.env`);
    process.exit(1);
  }
}

// Import after dotenv — @workspace/drizzle throws at import time without
// DATABASE_URL.
const { db } = await import("@workspace/drizzle/index");
const { orders, products, subscriptions } = await import(
  "@workspace/drizzle/schema"
);

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_SERVER as "sandbox" | "production",
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const stripeMode = process.env.STRIPE_SECRET_KEY!.includes("_live_")
  ? "LIVE"
  : "test";

console.log(
  `Polar -> Stripe product migration ${COMMIT ? "(COMMIT — writing to Stripe + DB)" : "(dry run — nothing is written)"}\n` +
    `  Polar server : ${process.env.POLAR_SERVER}\n` +
    `  Stripe mode  : ${stripeMode}\n`
);

const report = {
  created: 0,
  existing: 0,
  rowsRepointed: 0,
  ordersRemapped: 0,
  subsRemapped: 0,
  skipped: [] as string[],
};

// ─── Helpers ────────────────────────────────────────────────────

const getPriceAmount = (price: PolarProduct["prices"][number]): number =>
  "priceAmount" in price ? (price.priceAmount ?? 0) : 0;

const getPriceCurrency = (price: PolarProduct["prices"][number]): string =>
  "priceCurrency" in price ? (price.priceCurrency ?? "usd") : "usd";

const INTERVALS = ["day", "week", "month", "year"] as const;
type Interval = (typeof INTERVALS)[number];

const toStripeMetadata = (p: PolarProduct): Record<string, string> => {
  const out: Record<string, string> = { polarProductId: p.id };
  for (const [k, v] of Object.entries(p.metadata ?? {})) out[k] = String(v);
  return out;
};

const findStripeProduct = async (
  polarProductId: string
): Promise<Stripe.Product | null> => {
  // DB first: the mirror row carries metadata.polarProductId and is
  // immediately consistent (Stripe's search index lags ~1min after a create,
  // which once produced duplicate products on a quick re-run).
  const [mapped] = await db
    .select({ id: products.id })
    .from(products)
    .where(sql`${products.metadata}->>'polarProductId' = ${polarProductId}`)
    .limit(1);
  if (mapped?.id.startsWith("prod_")) {
    return stripe.products.retrieve(mapped.id);
  }

  try {
    const found = await stripe.products.search({
      query: `metadata['polarProductId']:'${polarProductId}'`,
      limit: 1,
    });
    if (found.data[0]) return found.data[0];
  } catch {
    // Restricted keys may not allow search — fall through to the list scan.
  }
  // Search can also return empty on fresh objects — always confirm by list.
  const listed = await stripe.products.list({ limit: 100 });
  return (
    listed.data.find((p) => p.metadata.polarProductId === polarProductId) ??
    null
  );
};

const listAllPolarProducts = async (): Promise<PolarProduct[]> => {
  const all = new Map<string, PolarProduct>();
  // Default listing excludes archived products — fetch both states.
  for (const isArchived of [false, true]) {
    for (let page = 1; ; page++) {
      const res = await polar.products.list({ page, limit: 100, isArchived });
      const items = res.result.items;
      for (const p of items) all.set(p.id, p);
      if (items.length < 100) break;
    }
  }
  return [...all.values()];
};

// ─── Migrate ────────────────────────────────────────────────────

const polarProducts = await listAllPolarProducts();
console.log(`Found ${polarProducts.length} Polar products.\n`);

for (const p of polarProducts) {
  const firstPrice = p.prices[0];
  const amount = firstPrice ? getPriceAmount(firstPrice) : 0;
  const currency = firstPrice ? getPriceCurrency(firstPrice) : "usd";
  const interval =
    p.isRecurring &&
    p.recurringInterval &&
    INTERVALS.includes(p.recurringInterval as Interval)
      ? (p.recurringInterval as Interval)
      : null;
  const label = `${p.name} (${p.id}, ${amount} ${currency}${interval ? `/${interval}` : ""}${p.isArchived ? ", archived" : ""})`;

  let stripeProduct = await findStripeProduct(p.id);
  let stripePriceId: string | null = null;

  if (stripeProduct) {
    report.existing++;
    stripePriceId =
      typeof stripeProduct.default_price === "string"
        ? stripeProduct.default_price
        : (stripeProduct.default_price?.id ?? null);
    console.log(`  exists ${label} -> ${stripeProduct.id}`);
  } else if (COMMIT) {
    stripeProduct = await stripe.products.create({
      name: p.name,
      // Stripe rejects empty-string descriptions.
      ...(p.description ? { description: p.description } : {}),
      active: !p.isArchived,
      metadata: toStripeMetadata(p),
    });
    const price = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: amount,
      currency,
      ...(interval ? { recurring: { interval } } : {}),
    });
    await stripe.products.update(stripeProduct.id, {
      default_price: price.id,
    });
    stripePriceId = price.id;
    report.created++;
    console.log(`  create ${label} -> ${stripeProduct.id} / ${price.id}`);
  } else {
    report.created++;
    console.log(`  would create ${label}`);
    continue; // dry run: no DB work possible without the Stripe ids
  }

  if (!stripeProduct) continue;

  // ── DB: re-point the mirror row + history references ──────────
  if (!COMMIT) continue;

  const [byPolarId] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, p.id))
    .limit(1);

  if (byPolarId) {
    // First run: move the row onto the Stripe id, keep all other fields.
    // The polarProductId marker makes the DB-first idempotency check hit.
    await db
      .update(products)
      .set({
        id: stripeProduct.id,
        stripePriceId,
        isArchived: p.isArchived,
        metadata: { ...(p.metadata ?? {}), polarProductId: p.id },
        updatedAt: new Date(),
      })
      .where(eq(products.id, p.id));
    report.rowsRepointed++;
    console.log(`    repointed mirror row ${p.id} -> ${stripeProduct.id}`);
  } else {
    // Re-run (row already on the Stripe id) or never-synced product.
    const [byStripeId] = await db
      .select({ id: products.id, stripePriceId: products.stripePriceId })
      .from(products)
      .where(eq(products.id, stripeProduct.id))
      .limit(1);
    if (byStripeId) {
      if (!byStripeId.stripePriceId && stripePriceId) {
        await db
          .update(products)
          .set({ stripePriceId, updatedAt: new Date() })
          .where(eq(products.id, stripeProduct.id));
        console.log(`    backfilled stripePriceId on ${stripeProduct.id}`);
      }
    } else {
      await db.insert(products).values({
        id: stripeProduct.id,
        name: p.name,
        description: p.description ?? null,
        popular: false,
        priceAmount: amount,
        priceCurrency: currency,
        recurringInterval: interval,
        isRecurring: p.isRecurring,
        isArchived: p.isArchived,
        stripePriceId,
        metadata: { ...(p.metadata ?? {}), polarProductId: p.id },
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: new Date(),
      });
      report.rowsRepointed++;
      console.log(`    inserted mirror row ${stripeProduct.id}`);
    }
  }

  // History references follow the product onto its Stripe id.
  const movedOrders = await db
    .update(orders)
    .set({ productId: stripeProduct.id })
    .where(eq(orders.productId, p.id))
    .returning({ id: orders.id });
  report.ordersRemapped += movedOrders.length;

  const movedSubs = await db
    .update(subscriptions)
    .set({ productId: stripeProduct.id })
    .where(eq(subscriptions.productId, p.id))
    .returning({ id: subscriptions.id });
  report.subsRemapped += movedSubs.length;

  if (movedOrders.length || movedSubs.length) {
    console.log(
      `    remapped ${movedOrders.length} orders, ${movedSubs.length} subscriptions`
    );
  }
}

console.log(
  `\n─── Report ${COMMIT ? "(committed)" : "(dry run)"} ───────────────────\n` +
    `  Products created  : ${report.created}\n` +
    `  Products existing : ${report.existing}\n` +
    `  Mirror rows moved : ${report.rowsRepointed}\n` +
    `  Orders remapped   : ${report.ordersRemapped}\n` +
    `  Subs remapped     : ${report.subsRemapped}\n`
);
if (report.skipped.length) {
  console.log("  Skipped:");
  for (const s of report.skipped) console.log(`    - ${s}`);
}
if (!COMMIT) {
  console.log("\nDry run only — re-run with --commit to write to Stripe + DB.");
}

process.exit(0);
