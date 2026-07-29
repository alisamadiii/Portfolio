// ═══════════════════════════════════════════════════════════════
//  PRICING CONFIG — edit prices here, both pages update
// ═══════════════════════════════════════════════════════════════

const PRICING = {
  // All-inclusive monthly plan ($/mo)
  monthly: 284,

  // Upfront custom build — displayed as a range, final quote settled manually
  upfront: { min: 2000, max: 3000 },

  // Monthly add-ons for the upfront plan ($/mo)
  hosting: 20,
  cms: 30,

  // Email usage — informational (not charged automatically yet)
  email: { freePerMonth: 1000, perExtraThousand: 1 },
};

// ═══════════════════════════════════════════════════════════════
//  CHECKOUT API — portfolio route that creates the Stripe session
// ═══════════════════════════════════════════════════════════════

const CHECKOUT_API =
  location.hostname === "127.0.0.1" || location.hostname === "localhost"
    ? "http://localhost:3000/api/agency/checkouts"
    : "https://alisamadii.com/api/agency/checkouts";

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

// ─── Shared helpers ─────────────────────────────────────────────

const fmtPrice = (amount) => "$" + amount.toLocaleString("en-US");

const fmtUpfrontRange = () =>
  `${fmtPrice(PRICING.upfront.min)}–${fmtPrice(PRICING.upfront.max)}`;
