// ─── Stripe Price IDs — production vs sandbox ───────────────────
// ONE per-project plan: Website Management, $100/mo, everything included
// (hosting, domain, email, maintenance, CMS editing). Created by
// packages/trpc/scripts/seed-project-plan.mts — rerun it with the live key
// and paste the printed id to fill the production slot.

const IS_PROD = process.env.VERCEL_ENV === "production";

export const PRICE_IDS = IS_PROD
  ? {
      plan: "price_1UMr7QEhKQbL1BLm2o3DHJ1P", // Website Management $100/mo (live)
    }
  : {
      plan: "price_1UMoKjEhKQbL1BLm0xZuUQiw", // Website Management $100/mo (sandbox)
    };

// ─── Gated features ─────────────────────────────────────────────
// One entry per subscription-gated feature. The single plan unlocks
// everything, so "cms" (the key all 402/dialog plumbing uses) is granted by
// it alone. Keep this file client-safe: constants only, no server imports.

export const FEATURES = {
  cms: {
    label: "Website plan",
    priceLabel: "$100/mo",
    price: PRICE_IDS.plan,
    grantedBy: [PRICE_IDS.plan],
  },
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const featureKeys = Object.keys(FEATURES) as [
  FeatureKey,
  ...FeatureKey[],
];
