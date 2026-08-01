// ─── Stripe Price IDs — production vs sandbox ───────────────────
// Edit these when prices change. Sandbox (test mode) IDs are used
// everywhere except the production deployment.

const IS_PROD = process.env.VERCEL_ENV === "production";

export const PRICE_IDS = IS_PROD
  ? {
      monthly: "price_1Tyd6g9sfDE02XZJuxFwcPEE", // $284/mo all-inclusive
      hosting: "price_1Tyd6i9sfDE02XZJdfIqq1zE", // $20/mo managed hosting
      cms: "price_1Tyd6l9sfDE02XZJd6PKJT1v", // $30/mo CMS access
      upfrontBase: "price_1TzSCw9sfDE02XZJGMWUjnRt", // TODO: replace — agency_upfront_base ($500 one-time)
      upfrontPage: "price_1TzSCw9sfDE02XZJPm94tRDX", // TODO: replace — agency_upfront_page ($200 one-time)
    }
  : {
      monthly: "price_1Tyd3SG7Gvayjjm6jbNbcyMp",
      hosting: "price_1Tyd2yG7Gvayjjm6l7mxEc9b",
      cms: "price_1Tyd17G7Gvayjjm6n0EijMTm",
      upfrontBase: "price_1TzPXlG7Gvayjjm6QCwM8VHK", // agency_upfront_base ($500 one-time)
      upfrontPage: "price_1TzPYiG7Gvayjjm6nFI2d59S", // agency_upfront_page ($200 one-time)
    };

// ─── Gated features ─────────────────────────────────────────────
// One entry per subscription-gated feature. `price` is what the purchase
// dialog sells; `grantedBy` lists every price whose active subscription
// unlocks the feature (the all-inclusive monthly plan bundles everything).
// Keep this file client-safe: constants only, no server imports.

export const FEATURES = {
  cms: {
    label: "CMS access",
    priceLabel: "$30/mo",
    price: PRICE_IDS.cms,
    grantedBy: [PRICE_IDS.cms, PRICE_IDS.monthly],
  },
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const featureKeys = Object.keys(FEATURES) as [
  FeatureKey,
  ...FeatureKey[],
];
