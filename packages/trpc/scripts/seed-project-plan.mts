/**
 * Creates the single per-project hub plan in Stripe: Website Management,
 * $100/mo recurring. Run once per mode (the key in apps/api/.env decides):
 *   npx tsx packages/trpc/scripts/seed-project-plan.mts
 * Then paste the printed price id into PRICE_IDS in
 * packages/trpc/src/lib/features.ts (sandbox or prod slot to match the key).
 * Idempotent: skips creation when a product named 'Website Management'
 * already exists in the mode.
 */

import * as path from "path";
import * as dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const mode = process.env.STRIPE_SECRET_KEY!.includes("_live_") ? "LIVE" : "test";

const existing = await stripe.products.list({ limit: 100, active: true });
const found = existing.data.find((p) => p.name === "Website Management");
if (found) {
  const priceId =
    typeof found.default_price === "string"
      ? found.default_price
      : found.default_price?.id;
  console.log(`[${mode}] exists: ${found.id} / ${priceId}`);
  process.exit(0);
}

const product = await stripe.products.create({
  name: "Website Management",
  description:
    "Fully managed website for one project: hosting, domain, professional email, ongoing updates and maintenance, and self-serve CMS editing from the hub.",
  metadata: { project: "AGENCY", scope: "per-project" },
});
const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 10000,
  currency: "usd",
  recurring: { interval: "month" },
});
await stripe.products.update(product.id, { default_price: price.id });

console.log(`[${mode}] created product: ${product.id}`);
console.log(`[${mode}] price id (paste into features.ts PRICE_IDS): ${price.id}`);
process.exit(0);
