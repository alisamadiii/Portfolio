/**
 * Creates the agency Launch plan in Stripe: "Agency: Launch" $1,200/mo
 * recurring + "Agency setup" $300 one-time. Run once per mode (the key in
 * apps/api/.env decides):
 *   npx tsx packages/trpc/scripts/seed-agency-launch.mts
 * Then paste the printed price ids into PLANS.agency.tiers.launch.prices in
 * packages/trpc/src/lib/payment/plans.ts (live or sandbox arg of price()).
 * Idempotent: skips any product whose name already exists in the mode.
 */

import * as path from "path";
import * as dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const mode = process.env.STRIPE_SECRET_KEY!.includes("_live_") ? "LIVE" : "test";

const existing = await stripe.products.list({ limit: 100, active: true });

const ensure = async (
  key: string,
  name: string,
  description: string,
  priceData: { unit_amount: number; recurring?: { interval: "month" } }
) => {
  const found = existing.data.find((p) => p.name === name);
  if (found) {
    const priceId =
      typeof found.default_price === "string"
        ? found.default_price
        : found.default_price?.id;
    console.log(`[${mode}] ${key} exists: ${found.id} / ${priceId}`);
    return;
  }
  const product = await stripe.products.create({
    name,
    description,
    metadata: { project: "AGENCY", scope: "agency" },
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    ...priceData,
  });
  await stripe.products.update(product.id, { default_price: price.id });
  console.log(`[${mode}] ${key} price id (paste into lib/payment/plans.ts): ${price.id}`);
};

await ensure(
  "agencyLaunch",
  "Agency: Launch",
  "Lead generation for one business: custom website with hosting and care, one managed Google Ads campaign, conversion tracking and a monthly report.",
  { unit_amount: 120000, recurring: { interval: "month" } }
);
await ensure(
  "agencySetup",
  "Agency setup",
  "One-time setup for the agency Launch plan.",
  { unit_amount: 30000 }
);
process.exit(0);
