// ═══════════════════════════════════════════════════════════════
//  PRICING CONFIG — canonical source of truth (build-time)
// ═══════════════════════════════════════════════════════════════
//
// Imported by `pricing.astro` / `PricingCards.astro` to render the monthly
// anchor into static HTML at build time (so crawlers/LLMs see a real number).
//
// The agency site no longer runs self-serve checkout — every plan routes to
// the "Get a Quote" form. The subscription anchor below is published as
// "$500 setup + $284/mo"; the one-time build is quote-only and has NO figure
// here on purpose, so a stale number can never leak into the page.

export const PRICING = {
  // All-inclusive Website-as-a-Service plan — published anchor:
  // one-time setup + monthly.
  setup: 500,
  monthly: 284,

  // E-commerce Storefront plan — one-time setup + monthly monitoring &
  // maintenance. Published as "$1,500 setup + $120/mo". Stripe products not
  // created yet; every CTA routes to /quote?plan=ecommerce until Ali wires
  // the subscription.
  ecommerce: { setup: 1500, monthly: 120 },
};

// ─── Shared helpers ─────────────────────────────────────────────

export const fmtPrice = (amount: number) =>
  "$" + amount.toLocaleString("en-US");
