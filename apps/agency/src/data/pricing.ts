// ═══════════════════════════════════════════════════════════════
//  PRICING CONFIG — canonical source of truth (build-time)
// ═══════════════════════════════════════════════════════════════
//
// Imported by `pricing.astro` / `PricingCards.astro` to render the monthly
// anchor into static HTML at build time (so crawlers/LLMs see a real number).
//
// The agency site no longer runs self-serve checkout — every plan routes to
// the "Get a Quote" form. The subscription anchor below is published as
// "$1,299 + $100/mo" (one-time setup fee + monthly), for local and small
// businesses. The one-time "own it" build plan was retired.

export const PRICING = {
  // All-inclusive Website-as-a-Service plan — published anchor:
  // one-time setup + monthly.
  setup: 1299,
  monthly: 100,

  // E-commerce Storefront plan — one-time setup + monthly monitoring &
  // maintenance. Published as "$1,500 setup + $120/mo". Stripe products not
  // created yet; every CTA routes to /quote?plan=ecommerce until Ali wires
  // the subscription.
  ecommerce: { setup: 1500, monthly: 120 },
};

// ─── Shared helpers ─────────────────────────────────────────────

export const fmtPrice = (amount: number) =>
  "$" + amount.toLocaleString("en-US");
