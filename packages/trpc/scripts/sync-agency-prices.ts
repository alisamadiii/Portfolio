/**
 * Sync agency prices from Stripe → apps/agency/public/pricing.js
 *
 *   pnpm sync:agency-prices        (from repo root)
 *   tsx packages/trpc/scripts/sync-agency-prices.ts
 *
 * Reads the live/test prices by their stable `lookup_key`, then rewrites the
 * numeric values inside the `// <auto:prices> … // </auto:prices>` block in
 * pricing.js. Non-Stripe fields (basePages, minPages, email) are left alone.
 *
 * The Stripe account (test vs live) is whichever STRIPE_SECRET_KEY resolves to
 * in apps/portfolio/.env. Price IDs are printed so you can paste them into
 * apps/portfolio/app/api/agency/checkouts/route.ts (PRICE_IDS).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import Stripe from "stripe";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

loadEnv({ path: resolve(repoRoot, "apps/portfolio/.env") });

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error("Missing STRIPE_SECRET_KEY (apps/portfolio/.env)");
  process.exit(1);
}
const stripe = new Stripe(secret);

// lookup_key → { field in the PRICING block it maps to }
const LOOKUP_KEYS = [
  "agency_monthly",
  "agency_hosting",
  "agency_cms",
  "agency_upfront_base",
  "agency_upfront_page",
] as const;

type LookupKey = (typeof LOOKUP_KEYS)[number];

// Maps a lookup_key to the `field: <number>` assignment we replace in pricing.js.
const FIELD_BY_KEY: Record<LookupKey, string> = {
  agency_monthly: "monthly",
  agency_hosting: "hosting",
  agency_cms: "cms",
  agency_upfront_base: "basePrice",
  agency_upfront_page: "perExtraPage",
};

async function main() {
  const { data: prices } = await stripe.prices.list({
    lookup_keys: [...LOOKUP_KEYS],
    active: true,
    limit: 100,
    expand: ["data.product"],
  });

  const byKey = new Map<string, Stripe.Price>();
  for (const price of prices) {
    if (price.lookup_key) byKey.set(price.lookup_key, price);
  }

  const pricingPath = resolve(repoRoot, "apps/agency/public/pricing.js");
  let source = readFileSync(pricingPath, "utf8");

  const missing: string[] = [];
  const idLog: string[] = [];

  for (const key of LOOKUP_KEYS) {
    const price = byKey.get(key);
    if (!price || price.unit_amount == null) {
      missing.push(key);
      continue;
    }
    const dollars = Math.round(price.unit_amount / 100);
    const field = FIELD_BY_KEY[key];
    // Replace `field: <number>` (the first occurrence in the block).
    const re = new RegExp(`(\\b${field}:\\s*)\\d+`);
    if (!re.test(source)) {
      console.warn(`Could not find "${field}:" in pricing.js — skipped ${key}`);
      continue;
    }
    source = source.replace(re, `$1${dollars}`);
    idLog.push(`  ${key.padEnd(20)} $${dollars}  ${price.id}`);
  }

  if (missing.length) {
    console.warn(
      `\nMissing lookup_keys in Stripe (create them + set the key): ${missing.join(", ")}`
    );
  }

  writeFileSync(pricingPath, source);

  console.log("\nUpdated apps/agency/public/pricing.js from Stripe:");
  console.log(idLog.join("\n"));
  console.log(
    "\nPaste the one-time price IDs into checkouts/route.ts PRICE_IDS " +
      "(upfrontBase = agency_upfront_base, upfrontPage = agency_upfront_page)."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
