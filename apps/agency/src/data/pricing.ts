// ═══════════════════════════════════════════════════════════════
//  PRICING CONFIG — canonical source of truth (build-time)
// ═══════════════════════════════════════════════════════════════
//
// Imported by `pricing.astro` to render prices into static HTML at build
// time (so crawlers/LLMs see real numbers, not empty spans). The browser
// runtime `public/pricing.js` mirrors these same numbers for checkout and
// the onboarding estimator — both files' `<auto:prices>` blocks are kept in
// sync by `tsx packages/trpc/scripts/sync-agency-prices.ts`. Edit prices in
// Stripe and run `pnpm sync:agency-prices`, not here.

// <auto:prices> — synced from Stripe. Non-Stripe fields (basePages, minPages,
// email) are left alone by the sync script.
export const PRICING = {
  // All-inclusive monthly plan ($/mo)
  monthly: 284,

  // Upfront custom build — charged per page through Stripe.
  // Price(pages) = basePrice + perExtraPage * (pages - basePages)
  upfront: {
    basePrice: 500, // $ one-time, covers basePages
    basePages: 1,
    perExtraPage: 200, // $ per page beyond basePages
    minPages: 1,
  },

  // Monthly add-ons for the upfront plan ($/mo)
  hosting: 20,
  cms: 30,

  // Email usage — informational (not charged automatically yet)
  email: { freePerMonth: 1000, perExtraThousand: 1 },
};
// </auto:prices>

// ─── Shared helpers ─────────────────────────────────────────────

export const fmtPrice = (amount: number) =>
  "$" + amount.toLocaleString("en-US");

// One-time upfront total for a given page count.
export const upfrontTotal = (pages: number) => {
  const { basePrice, basePages, perExtraPage, minPages } = PRICING.upfront;
  const p = Math.max(minPages, pages || minPages);
  return basePrice + perExtraPage * Math.max(0, p - basePages);
};
