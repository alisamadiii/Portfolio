/**
 * One-off Polar -> Stripe data migration (customers + orders).
 *
 * Reads customers and orders from the Polar API and recreates them in Stripe:
 *  - Polar customer  -> Stripe customer   (dedup on metadata.polarCustomerId)
 *  - Polar paid order -> Stripe invoice   (ad-hoc line item, finalized, paid
 *                                          out-of-band — no email is ever sent)
 * Also backfills user.stripeCustomerId in the DB (matched on Polar externalId,
 * which is our user.id) where the column is still null.
 *
 * Idempotent: re-running skips anything already migrated (metadata markers
 * polarCustomerId / polarOrderId). Subscriptions are intentionally out of
 * scope — none exist in Polar.
 *
 * Run from the repo root:
 *   npx tsx packages/trpc/scripts/migrate-polar-to-stripe.ts            # dry run
 *   npx tsx packages/trpc/scripts/migrate-polar-to-stripe.ts --commit   # real run
 *
 * Env is loaded from apps/api/.env (expects STRIPE_SECRET_KEY,
 * POLAR_ACCESS_TOKEN, POLAR_SERVER, DATABASE_URL). NOTE: Stripe dashboard
 * "Successful payments" / invoice emails should be OFF for the run — the API
 * itself sends nothing for out-of-band invoices, but account-level automatic
 * receipts are a dashboard setting.
 */

import * as path from "path";
import { Polar } from "@polar-sh/sdk";
import type { Customer } from "@polar-sh/sdk/models/components/customer.js";
import type { Order } from "@polar-sh/sdk/models/components/order.js";
import * as dotenv from "dotenv";
import { eq, isNull, and } from "drizzle-orm";
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
const { user } = await import("@workspace/drizzle/schema");

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_SERVER as "sandbox" | "production",
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const stripeMode = process.env.STRIPE_SECRET_KEY!.includes("_live_")
  ? "LIVE"
  : "test";

console.log(
  `Polar -> Stripe migration ${COMMIT ? "(COMMIT — writing to Stripe)" : "(dry run — nothing is written)"}\n` +
    `  Polar server : ${process.env.POLAR_SERVER}\n` +
    `  Stripe mode  : ${stripeMode}\n`
);

// ─── Report ─────────────────────────────────────────────────────

const report = {
  customersCreated: 0,
  customersExisting: 0,
  customersSkipped: [] as string[],
  usersBackfilled: 0,
  invoicesCreated: 0,
  invoicesExisting: 0,
  ordersSkipped: [] as string[],
};

// ─── Customers ──────────────────────────────────────────────────

/** polarCustomerId -> stripeCustomerId */
const customerMap = new Map<string, string>();

const findStripeCustomer = async (
  polarCustomerId: string,
  email: string | null
): Promise<Stripe.Customer | null> => {
  try {
    const found = await stripe.customers.search({
      query: `metadata['polarCustomerId']:'${polarCustomerId}'`,
      limit: 1,
    });
    if (found.data[0]) return found.data[0];
  } catch {
    // Restricted keys may not allow search — fall through to list-by-email.
  }
  if (email) {
    const listed = await stripe.customers.list({ email, limit: 10 });
    const match = listed.data.find(
      (c) => c.metadata.polarCustomerId === polarCustomerId
    );
    if (match) return match;
  }
  return null;
};

const listAllPolarCustomers = async (): Promise<Customer[]> => {
  const all: Customer[] = [];
  for (let page = 1; ; page++) {
    const res = await polar.customers.list({ page, limit: 100 });
    const items = res.result.items;
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
};

const migrateCustomers = async () => {
  const customers = await listAllPolarCustomers();
  console.log(`Found ${customers.length} Polar customers.\n`);

  for (const c of customers) {
    const label = `${c.email ?? "<no email>"} (${c.id})`;

    if (!c.email) {
      report.customersSkipped.push(`${c.id}: no email`);
      console.log(`  skip customer ${label} — no email`);
      continue;
    }

    const existing = await findStripeCustomer(c.id, c.email);
    if (existing) {
      customerMap.set(c.id, existing.id);
      report.customersExisting++;
      console.log(`  exists ${label} -> ${existing.id}`);
    } else if (COMMIT) {
      const created = await stripe.customers.create({
        email: c.email,
        name: c.name ?? undefined,
        metadata: {
          polarCustomerId: c.id,
          externalId: c.externalId ?? "",
        },
      });
      customerMap.set(c.id, created.id);
      report.customersCreated++;
      console.log(`  create ${label} -> ${created.id}`);
    } else {
      // Dry run: map a placeholder so the orders pass can still report what
      // it would do for this customer.
      customerMap.set(c.id, `dry_${c.id}`);
      report.customersCreated++;
      console.log(`  would create ${label}`);
    }

    // Backfill user.stripeCustomerId (externalId === user.id), only when null.
    const stripeId = customerMap.get(c.id);
    if (c.externalId && stripeId) {
      if (COMMIT) {
        const updated = await db
          .update(user)
          .set({ stripeCustomerId: stripeId })
          .where(and(eq(user.id, c.externalId), isNull(user.stripeCustomerId)))
          .returning({ id: user.id });
        if (updated.length > 0) {
          report.usersBackfilled++;
          console.log(`    backfilled user.stripeCustomerId for ${c.externalId}`);
        }
      } else {
        const [row] = await db
          .select({ id: user.id, stripeCustomerId: user.stripeCustomerId })
          .from(user)
          .where(eq(user.id, c.externalId))
          .limit(1);
        if (row && !row.stripeCustomerId) {
          report.usersBackfilled++;
          console.log(`    would backfill user.stripeCustomerId for ${c.externalId}`);
        }
      }
    }
  }
};

// ─── Orders ─────────────────────────────────────────────────────

const invoiceExistsForOrder = async (
  stripeCustomerId: string,
  polarOrderId: string
): Promise<boolean> => {
  // Dry-run placeholder customer — nothing can exist yet.
  if (stripeCustomerId.startsWith("dry_")) return false;
  try {
    const found = await stripe.invoices.search({
      query: `metadata['polarOrderId']:'${polarOrderId}'`,
      limit: 1,
    });
    return found.data.length > 0;
  } catch {
    // Search unavailable (restricted key) — scan the customer's invoices.
    const listed = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 100,
    });
    return listed.data.some((i) => i.metadata?.polarOrderId === polarOrderId);
  }
};

const listAllPolarOrders = async (): Promise<Order[]> => {
  const all: Order[] = [];
  for (let page = 1; ; page++) {
    const res = await polar.orders.list({ page, limit: 100 });
    const items = res.result.items;
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
};

const migrateOrders = async () => {
  const orders = await listAllPolarOrders();
  console.log(`\nFound ${orders.length} Polar orders.\n`);

  for (const o of orders) {
    const label = `${o.id} (${o.customer.email ?? "?"}, ${o.totalAmount} ${o.currency})`;

    if (o.status !== "paid") {
      report.ordersSkipped.push(`${o.id}: status=${o.status}`);
      console.log(`  skip order ${label} — status ${o.status}`);
      continue;
    }
    if (o.totalAmount <= 0) {
      report.ordersSkipped.push(`${o.id}: non-positive total ${o.totalAmount}`);
      console.log(`  skip order ${label} — non-positive total`);
      continue;
    }

    const stripeCustomerId = customerMap.get(o.customerId);
    if (!stripeCustomerId) {
      report.ordersSkipped.push(
        `${o.id}: no Stripe customer for polar customer ${o.customerId}` +
          (COMMIT ? "" : " (dry run — customer not created yet)")
      );
      console.log(`  skip order ${label} — no mapped Stripe customer`);
      continue;
    }

    if (await invoiceExistsForOrder(stripeCustomerId, o.id)) {
      report.invoicesExisting++;
      console.log(`  exists invoice for order ${label}`);
      continue;
    }

    const description = `${o.product?.name ?? "Purchase"} (migrated from Polar, originally ${o.createdAt.toISOString().slice(0, 10)})`;

    if (!COMMIT) {
      report.invoicesCreated++;
      console.log(`  would create paid invoice for ${label} — "${description}"`);
      continue;
    }

    // Draft invoice first, then attach the item to it, finalize without
    // auto-advance, and settle out-of-band. No step emails the customer.
    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      auto_advance: false,
      collection_method: "send_invoice",
      days_until_due: 0,
      metadata: {
        polarOrderId: o.id,
        polarCreatedAt: o.createdAt.toISOString(),
        polarInvoiceNumber: o.invoiceNumber ?? "",
      },
    });
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      invoice: invoice.id,
      amount: o.totalAmount,
      currency: o.currency,
      description,
    });
    await stripe.invoices.finalizeInvoice(invoice.id!, { auto_advance: false });
    await stripe.invoices.pay(invoice.id!, { paid_out_of_band: true });

    report.invoicesCreated++;
    console.log(`  created paid invoice ${invoice.id} for order ${label}`);
  }
};

// ─── Run ────────────────────────────────────────────────────────

await migrateCustomers();
await migrateOrders();

console.log(
  `\n─── Report ${COMMIT ? "(committed)" : "(dry run)"} ───────────────────\n` +
    `  Customers created : ${report.customersCreated}\n` +
    `  Customers existing: ${report.customersExisting}\n` +
    `  Users backfilled  : ${report.usersBackfilled}\n` +
    `  Invoices created  : ${report.invoicesCreated}\n` +
    `  Invoices existing : ${report.invoicesExisting}\n`
);
if (report.customersSkipped.length) {
  console.log("  Skipped customers:");
  for (const s of report.customersSkipped) console.log(`    - ${s}`);
}
if (report.ordersSkipped.length) {
  console.log("  Skipped orders:");
  for (const s of report.ordersSkipped) console.log(`    - ${s}`);
}
if (!COMMIT) {
  console.log("\nDry run only — re-run with --commit to write to Stripe.");
}

process.exit(0);
