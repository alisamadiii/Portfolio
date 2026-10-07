/**
 * Run from the repo root: npx tsx packages/trpc/scripts/seed-leads-subscription.ts
 * Requires STRIPE_SECRET_KEY in apps/api/.env.
 *
 * Creates ONE "Lead Finder" subscription product with three monthly tier
 * prices (metadata.credits on each PRICE drives the per-cycle balance reset
 * on invoice.paid), then archives the legacy one-time credit-pack products.
 * The webhook mirrors product + prices into the DB.
 */

import * as path from "path";
import * as dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env.local") });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const TIERS = [
  { nickname: "Starter", priceAmount: 500, credits: 500, popular: false },
  { nickname: "Growth", priceAmount: 1200, credits: 1400, popular: true },
  { nickname: "Pro", priceAmount: 2500, credits: 3500, popular: false },
];

async function main() {
  const mode = process.env.STRIPE_SECRET_KEY!.includes("_live_")
    ? "LIVE"
    : "test";
  console.log(`Creating Lead Finder subscription product (${mode})...\n`);

  const product = await stripe.products.create({
    name: "Lead Finder",
    description: `- Monthly credit allowance, resets every billing cycle
- 1 credit = 1 business without a working website
- Scan whole cities or add businesses by hand
- Call scripts, pipeline, Google Calendar scheduling included
- Cancel anytime, leftover credits stay usable`,
    metadata: { project: "LEADS" },
  });
  console.log(`✓  product ${product.id}`);

  let defaultPriceId: string | null = null;
  for (const tier of TIERS) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.priceAmount,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: `${tier.nickname}: ${tier.credits.toLocaleString()} credits/mo`,
      metadata: {
        credits: String(tier.credits),
        ...(tier.popular ? { popular: "true" } : {}),
      },
    });
    if (!defaultPriceId) defaultPriceId = price.id;
    console.log(
      `✓  ${tier.nickname}  $${tier.priceAmount / 100}/mo → ${tier.credits} credits  (${price.id})`
    );
  }
  await stripe.products.update(product.id, {
    default_price: defaultPriceId!,
  });

  // Archive the legacy one-time packs so they drop out of every pricing UI.
  const legacy = await stripe.products.search({
    query: `active:'true' AND metadata['project']:'LEADS'`,
    limit: 20,
  });
  for (const p of legacy.data) {
    if (p.id === product.id) continue;
    await stripe.products.update(p.id, { active: false });
    console.log(`✓  archived legacy pack ${p.name} (${p.id})`);
  }

  console.log("\nDone. Product + prices sync to the DB via webhook.");
}

main();
