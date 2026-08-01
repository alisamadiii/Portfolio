// ═══════════════════════════════════════════════════════════════
//  PRICING CONFIG — edit prices here, both pages update
// ═══════════════════════════════════════════════════════════════

// <auto:prices> — numbers below are synced from Stripe by
// `tsx packages/trpc/scripts/sync-agency-prices.ts`. Edit in Stripe, not here.
const PRICING = {
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

// ═══════════════════════════════════════════════════════════════
//  CHECKOUT API — portfolio route that creates the Stripe session
// ═══════════════════════════════════════════════════════════════

const API_BASE =
  location.hostname === "127.0.0.1" || location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://www.alisamadii.com";

const CHECKOUT_API = `${API_BASE}/api/agency/checkouts`;
const PROMO_API = `${API_BASE}/api/agency/promo`;

// POST payload → { url }, then redirect to Stripe Checkout.
// Throws on failure so callers can reset their loading state.
async function createCheckout(payload) {
  const res = await fetch(CHECKOUT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Checkout failed");
  const { url } = await res.json();
  window.location.href = url;
}

// POST { code } → promo validation result. Throws on network/server error.
async function validatePromo(code) {
  const res = await fetch(PROMO_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error("Promo validation failed");
  return res.json();
}

// ─── Shared helpers ─────────────────────────────────────────────

const fmtPrice = (amount) => "$" + amount.toLocaleString("en-US");

// One-time upfront total for a given page count.
const upfrontTotal = (pages) => {
  const { basePrice, basePages, perExtraPage, minPages } = PRICING.upfront;
  const p = Math.max(minPages, pages || minPages);
  return basePrice + perExtraPage * Math.max(0, p - basePages);
};

const fmtUpfront = (pages) => fmtPrice(upfrontTotal(pages));
