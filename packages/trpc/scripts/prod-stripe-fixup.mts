/**
 * One-off prod-DB fixup after the Polar -> Stripe cutover. The testing branch
 * got the data migration; prod only got the schema. Stripe is the source of
 * truth now, so this needs no Polar access:
 *
 *  1. Repoint product mirror rows from Polar UUIDs to Stripe ids
 *     (metadata.polarProductId on the Stripe product is the join), set
 *     stripe_price_id + archived state + description, and remap
 *     orders/subscription product references.
 *  2. Backfill user.stripeCustomerId from Stripe customers
 *     (metadata.externalId = user.id).
 *  3. Re-point orphaned orders (userId with no user row) to the live user
 *     with the same email.
 *
 * Run from the repo root:
 *   npx tsx packages/trpc/scripts/prod-stripe-fixup.mts            # dry run
 *   npx tsx packages/trpc/scripts/prod-stripe-fixup.mts --commit   # real run
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { eq, inArray, isNull, and, ne, sql } from "drizzle-orm";
import Stripe from "stripe";

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

const COMMIT = process.argv.includes("--commit");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const { db } = await import("@workspace/drizzle/index");
const { orders, products, subscriptions, user } = await import(
  "@workspace/drizzle/schema"
);

console.log(
  `Prod fixup ${COMMIT ? "(COMMIT)" : "(dry run)"} | DB: ${new URL(process.env.DATABASE_URL!).host} | Stripe: ${process.env.STRIPE_SECRET_KEY!.includes("_live_") ? "LIVE" : "test"}\n`
);

// ─── 1. Products ────────────────────────────────────────────────

const stripeProducts = await stripe.products.list({
  limit: 100,
  expand: ["data.default_price"],
});

for (const sp of stripeProducts.data) {
  const polarId = sp.metadata.polarProductId;
  if (!polarId) continue; // dupes had their marker cleared — skip

  const priceId =
    typeof sp.default_price === "string"
      ? sp.default_price
      : (sp.default_price?.id ?? null);

  const [byPolarId] = await db
    .select({ id: products.id, metadata: products.metadata })
    .from(products)
    .where(eq(products.id, polarId))
    .limit(1);

  if (byPolarId) {
    console.log(`repoint ${polarId} -> ${sp.id} (${sp.name}) price:${priceId}`);
    if (COMMIT) {
      await db
        .update(products)
        .set({
          id: sp.id,
          stripePriceId: priceId,
          isArchived: !sp.active,
          description: sp.description ?? null,
          metadata: {
            ...(byPolarId.metadata as Record<string, unknown>),
            polarProductId: polarId,
          },
          updatedAt: new Date(),
        })
        .where(eq(products.id, polarId));
    }
  } else {
    const [byStripeId] = await db
      .select({ id: products.id, stripePriceId: products.stripePriceId })
      .from(products)
      .where(eq(products.id, sp.id))
      .limit(1);
    if (byStripeId) {
      if (!byStripeId.stripePriceId && priceId) {
        console.log(`backfill price on ${sp.id} (${sp.name})`);
        if (COMMIT) {
          await db
            .update(products)
            .set({ stripePriceId: priceId, updatedAt: new Date() })
            .where(eq(products.id, sp.id));
        }
      } else {
        console.log(`ok ${sp.id} (${sp.name})`);
      }
    } else {
      console.log(`no mirror row for ${sp.id} (${sp.name}) — skipped (archived leftovers are not inserted)`);
      continue;
    }
  }

  // History references follow the product onto its Stripe id.
  if (COMMIT) {
    const movedOrders = await db
      .update(orders)
      .set({ productId: sp.id })
      .where(eq(orders.productId, polarId))
      .returning({ id: orders.id });
    const movedSubs = await db
      .update(subscriptions)
      .set({ productId: sp.id })
      .where(eq(subscriptions.productId, polarId))
      .returning({ id: subscriptions.id });
    if (movedOrders.length || movedSubs.length)
      console.log(`  remapped ${movedOrders.length} orders, ${movedSubs.length} subs`);
  } else {
    const refs = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.productId, polarId));
    if (refs.length) console.log(`  would remap ${refs.length} orders`);
  }
}

// ─── 2. user.stripeCustomerId backfill ──────────────────────────

const customers = await stripe.customers.list({ limit: 100 });
let backfilled = 0;
for (const c of customers.data) {
  const externalId = c.metadata?.externalId;
  if (!externalId) continue;
  if (COMMIT) {
    const updated = await db
      .update(user)
      .set({ stripeCustomerId: c.id })
      .where(and(eq(user.id, externalId), isNull(user.stripeCustomerId)))
      .returning({ id: user.id });
    backfilled += updated.length;
  } else {
    const [row] = await db
      .select({ id: user.id, stripeCustomerId: user.stripeCustomerId })
      .from(user)
      .where(eq(user.id, externalId))
      .limit(1);
    if (row && !row.stripeCustomerId) backfilled++;
  }
}
console.log(`\nuser.stripeCustomerId backfill: ${backfilled}`);

// ─── 3. Orphaned orders ─────────────────────────────────────────

const allOrders = await db.select().from(orders);
const orderUserIds = [...new Set(allOrders.map((o) => o.userId))];
const existingUsers = await db
  .select({ id: user.id })
  .from(user)
  .where(inArray(user.id, orderUserIds));
const existingIds = new Set(existingUsers.map((u) => u.id));

for (const o of allOrders) {
  if (existingIds.has(o.userId) || !o.email) continue;
  const [liveUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, o.email))
    .limit(1);
  if (!liveUser) {
    console.log(`orphan order ${o.id} (${o.email}) — no user with that email`);
    continue;
  }
  console.log(`repair orphan order ${o.id}: -> ${liveUser.id} (${o.email})`);
  if (COMMIT) {
    await db
      .update(orders)
      .set({ userId: liveUser.id, updatedAt: new Date() })
      .where(eq(orders.id, o.id));
  }
}

// ─── Verify ─────────────────────────────────────────────────────

const [motion] = await db
  .select()
  .from(products)
  .where(
    and(
      sql`${products.metadata}->>'project' = 'MOTION'`,
      eq(products.isArchived, false)
    )
  )
  .limit(1);
console.log(
  `\nMOTION sellable check: id:${motion?.id ?? "—"} stripePriceId:${motion?.stripePriceId ?? "null"} ${motion?.stripePriceId ? "✓" : "✗ NOT sellable"}`
);

const buyers = await db
  .select({ userId: orders.userId, email: orders.email })
  .from(orders)
  .where(
    and(eq(orders.status, "paid"), sql`${orders.metadata}->>'project' = 'MOTION'`)
  );
console.log(`Motion paid orders: ${buyers.length}`);
for (const b of buyers) {
  const [u] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, b.userId))
    .limit(1);
  console.log(` ${b.email} | user row: ${u ? "✓" : "✗ ORPHANED"}`);
}

if (!COMMIT) console.log("\nDry run — re-run with --commit to apply.");
process.exit(0);
