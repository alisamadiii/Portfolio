/**
 * Run from the repo root: npx tsx packages/trpc/scripts/seed-leads-products.ts
 * Requires STRIPE_SECRET_KEY in apps/api/.env. Creates the lead-finder credit
 * packs in Stripe (product + one-time price); the webhook mirrors them into
 * the DB. metadata.credits drives the grant on invoice.paid.
 */

import * as path from "path";
import * as dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env.local") });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const LEADS_PACKS = [
  {
    name: "Starter Pack: 200 credits",
    priceAmount: 500, // $5
    credits: 200,
    popular: false,
    description: `- 200 lead credits
- 1 credit = 1 business without a working website
- Credits never expire

Enough for a few full city scans. You only spend credits on real prospects: businesses with no website, a dead site, or social-media-only presence.`,
  },
  {
    name: "Growth Pack: 450 credits",
    priceAmount: 1000, // $10
    credits: 450,
    popular: true,
    description: `- 450 lead credits
- 1 credit = 1 business without a working website
- Credits never expire

The best value for steady prospecting. Scan multiple niches and cities, and unlock every lead you find.`,
  },
  {
    name: "Pro Pack: 1,000 credits",
    priceAmount: 2000, // $20
    credits: 1000,
    popular: false,
    description: `- 1,000 lead credits
- 1 credit = 1 business without a working website
- Credits never expire

For heavy users and agencies mapping whole regions. The cheapest cost per lead.`,
  },
];

async function main() {
  const mode = process.env.STRIPE_SECRET_KEY!.includes("_live_")
    ? "LIVE"
    : "test";
  console.log(
    `Creating ${LEADS_PACKS.length} credit packs in Stripe (${mode})...\n`
  );

  for (const p of LEADS_PACKS) {
    try {
      const product = await stripe.products.create({
        name: p.name,
        description: p.description,
        metadata: {
          project: "LEADS",
          credits: String(p.credits),
          ...(p.popular ? { popular: "true" } : {}),
        },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: p.priceAmount,
        currency: "usd",
      });
      await stripe.products.update(product.id, { default_price: price.id });
      console.log(`✓  ${product.name}  (${product.id}, ${price.id})`);
    } catch (err) {
      console.error(`✗  ${p.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\nDone. Products will sync to your DB via webhook.");
}

main();
