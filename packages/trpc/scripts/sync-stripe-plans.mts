/**
 * Makes Stripe match the self-serve hub plans in PLAN_SPECS below, then
 * writes the resolved price ids to src/lib/payment/stripe-prices.generated.json
 * (read by lib/payment/plans.ts). Runs on every api build, before
 * `next build`, so pushing a price change to main updates live Stripe and
 * bundles the new id in the same deploy:
 *   pnpm --filter @workspace/trpc stripe:sync-plans
 * The key decides the mode (sk_live_ -> live, else test). Idempotent: a run
 * with nothing to change makes no Stripe writes.
 *
 * Per plan: find the product by name (create if missing), keep exactly one
 * active price under `lookupKey` at the spec amount (a changed amount gets a
 * new price, the lookup key moves to it and the old one is archived), set it
 * as the product default, sync description + marketing features, and mirror
 * the product row into the DB so the hub plan card shows it right away.
 * Existing subscribers stay on their old price until moved in Stripe; their
 * ids live in `legacyRecurring` in plans.ts so entitlements keep working.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import Stripe from "stripe";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../apps/api/.env") });

// ─── Desired state ──────────────────────────────────────────────

const PLAN_SPECS = {
  "website:paid": {
    productName: "Website Management",
    lookupKey: "website_paid_monthly",
    unitAmount: 2500,
    currency: "usd",
    interval: "month",
    description:
      "Canvas editor, AI chat edits and publishing from the hub for one website project.",
    features: [
      "Canvas editor",
      "AI chat edits",
      "Publish to GitHub",
      "Analytics",
      "Speed reports",
    ],
  },
} as const satisfies Record<
  string,
  {
    productName: string;
    lookupKey: string;
    unitAmount: number;
    currency: string;
    interval: Stripe.PriceCreateParams.Recurring.Interval;
    description: string;
    features: readonly string[];
  }
>;

const OUT = path.resolve(here, "../src/lib/payment/stripe-prices.generated.json");

// ─── Run ────────────────────────────────────────────────────────

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.log("[stripe:sync-plans] STRIPE_SECRET_KEY not set, skipping");
  process.exit(0);
}
const mode = key.includes("_live_") ? "live" : "test";
const stripe = new Stripe(key);
const log = (msg: string) => console.log(`[stripe:sync-plans:${mode}] ${msg}`);

const sameFeatures = (product: Stripe.Product, wanted: readonly string[]) => {
  const names = (product.marketing_features ?? []).map((f) => f.name ?? "");
  return names.length === wanted.length && names.every((n, i) => n === wanted[i]);
};

const syncPlan = async (spec: (typeof PLAN_SPECS)[keyof typeof PLAN_SPECS]) => {
  const products = await stripe.products.list({ limit: 100, active: true });
  let product = products.data.find((p) => p.name === spec.productName);
  if (!product) {
    product = await stripe.products.create({
      name: spec.productName,
      metadata: { project: "AGENCY", scope: "per-project" },
    });
    log(`created product ${product.id}`);
  }

  const [current] = (
    await stripe.prices.list({ lookup_keys: [spec.lookupKey], active: true, limit: 1 })
  ).data;
  const matches =
    current &&
    current.product === product.id &&
    current.unit_amount === spec.unitAmount &&
    current.currency === spec.currency &&
    current.recurring?.interval === spec.interval;

  let priceId = current?.id ?? "";
  if (!matches) {
    const created = await stripe.prices.create({
      product: product.id,
      unit_amount: spec.unitAmount,
      currency: spec.currency,
      recurring: { interval: spec.interval },
      lookup_key: spec.lookupKey,
      transfer_lookup_key: true,
    });
    priceId = created.id;
    log(`created price ${priceId} (${spec.unitAmount} ${spec.currency}/${spec.interval})`);
  }

  const defaultPrice =
    typeof product.default_price === "string"
      ? product.default_price
      : product.default_price?.id ?? null;

  if (
    defaultPrice !== priceId ||
    product.description !== spec.description ||
    !sameFeatures(product, spec.features)
  ) {
    await stripe.products.update(product.id, {
      default_price: priceId,
      description: spec.description,
      marketing_features: spec.features.map((name) => ({ name })),
    });
    log(`updated product ${product.id}`);
  }

  // Archive every other active price on the product (the old default, a
  // price whose lookup key just moved). Subscribers keep billing on them.
  const active = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  for (const old of active.data) {
    if (old.id === priceId) continue;
    await stripe.prices.update(old.id, { active: false });
    log(`archived price ${old.id}`);
  }

  return { productId: product.id, priceId };
};

try {
  const ids: Record<string, string> = {};
  const productIds: string[] = [];
  for (const [plan, spec] of Object.entries(PLAN_SPECS)) {
    const { productId, priceId } = await syncPlan(spec);
    ids[plan] = priceId;
    productIds.push(productId);
    log(`${plan} -> ${priceId}`);
  }

  // Mirror into the product table (same upsert the webhook runs). Skipped
  // without a DB so the ids file still gets written.
  if (process.env.DATABASE_URL) {
    const { syncStripeProduct } = await import("../src/lib/payment/stripe-sync");
    for (const id of productIds) await syncStripeProduct(id);
    const { pool } = await import("@workspace/drizzle/index");
    await pool.end();
    log("mirrored products into DB");
  }

  const existing = fs.existsSync(OUT)
    ? (JSON.parse(fs.readFileSync(OUT, "utf8")) as Record<string, Record<string, string>>)
    : {};
  const next = { live: {}, test: {}, ...existing, [mode]: { ...existing[mode], ...ids } };
  const body = `${JSON.stringify(next, null, 2)}\n`;
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== body) {
    fs.writeFileSync(OUT, body);
    log(`wrote ${path.relative(process.cwd(), OUT)}`);
  }
  process.exit(0);
} catch (error) {
  console.error(`[stripe:sync-plans:${mode}]`, error);
  // A live deploy must not ship a checkout pointing at a stale price.
  process.exit(mode === "live" ? 1 : 0);
}
