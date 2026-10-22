// ─── Plans: the one file for products, tiers, prices and features ─────
// Stripe only bills. What each plan unlocks lives here: a subscription's
// price id maps to a tier, and the tier lists the features (and limits) the
// project gets. A project with no live subscription is on website/free.
//
// Server gates (requireFeature) and the hub's usePlans hook both read this
// file, so moving a feature between tiers is a one-line change.
// Keep it client-safe: constants, types and pure helpers only.

import type { subscriptions } from "@workspace/drizzle/schema";

// Production when the Node process runs in production mode (next build/start,
// or the Coolify container), NOT Vercel-specific, so self-hosting picks the
// live Stripe prices instead of silently falling back to sandbox.
const IS_PROD = process.env.NODE_ENV === "production";
const price = (live: string, sandbox: string) => (IS_PROD ? live : sandbox);

// ─── Features ───────────────────────────────────────────────────

export const FEATURES = {
  domain: "Custom domain",
  emails: "Emails",
  analytics: "Analytics",
  speed: "Speed",
  "ai-chat": "AI chat",
  leads: "Leads",
  ads: "Google Ads reports",
  newsletter: "Newsletter",
} as const;

export type Feature = keyof typeof FEATURES;

/** Numeric caps per tier. null = unlimited. */
export type Limits = {
  /** Google Ads campaigns we run for the client. */
  adCampaigns: number | null;
  /** Monthly ad spend (USD) the tier covers. */
  adSpendCap: number | null;
};

const NO_LIMITS: Limits = { adCampaigns: null, adSpendCap: null };

type TierDef = {
  label: string;
  /** Shown in UI next to the label; null for free. */
  priceLabel: string | null;
  /**
   * Stripe prices. `recurring` is the subscription price that identifies the
   * tier; `setup` is a one-time fee on the first invoice. null = not sold
   * (free, or not launched yet). An empty string = id not created in this
   * Stripe mode yet (run the seed script).
   */
  prices: { recurring: string; setup?: string } | null;
  features: readonly Feature[];
  limits?: Partial<Limits>;
};

const WEBSITE_PAID_FEATURES = [
  "domain",
  "emails",
  "analytics",
  "speed",
  "ai-chat",
] as const satisfies readonly Feature[];

// ─── Catalog ────────────────────────────────────────────────────

export const PLANS = {
  website: {
    label: "Website",
    tiers: {
      free: {
        label: "Free",
        priceLabel: null,
        prices: null,
        features: ["analytics", "speed"],
      },
      paid: {
        label: "Website plan",
        priceLabel: "$100/mo",
        // scripts/seed-project-plan.mts
        prices: {
          recurring: price(
            "price_1UMr7QEhKQbL1BLm2o3DHJ1P",
            "price_1UMoKjEhKQbL1BLm0xZuUQiw"
          ),
        },
        features: WEBSITE_PAID_FEATURES,
      },
    },
  },
  agency: {
    label: "Agency",
    tiers: {
      launch: {
        label: "Launch",
        priceLabel: "$1,200/mo + $300 setup",
        // scripts/seed-agency-launch.mts (live ids still to create)
        prices: {
          recurring: price("", "price_1UTKyOEhKQbL1BLmeqzyho6l"),
          setup: price("", "price_1UTKyPEhKQbL1BLmoPB4xRAO"),
        },
        features: [...WEBSITE_PAID_FEATURES, "leads", "ads"],
        limits: { adCampaigns: 1, adSpendCap: 3000 },
      },
      growth: {
        label: "Growth",
        priceLabel: "Coming soon",
        prices: null,
        features: [...WEBSITE_PAID_FEATURES, "leads", "ads", "newsletter"],
        limits: { adCampaigns: 5, adSpendCap: 6000 },
      },
      scale: {
        label: "Scale",
        priceLabel: "Coming soon",
        prices: null,
        features: [...WEBSITE_PAID_FEATURES, "leads", "ads", "newsletter"],
        limits: { adCampaigns: null, adSpendCap: 10000 },
      },
    },
  },
} as const satisfies Record<
  string,
  { label: string; tiers: Record<string, TierDef> }
>;

// ─── Types ──────────────────────────────────────────────────────

export type ProductId = keyof typeof PLANS;
export type TierId<P extends ProductId = ProductId> = Extract<
  keyof (typeof PLANS)[P]["tiers"],
  string
>;
/** "website:free" | "website:paid" | "agency:launch" | … */
export type PlanKey = { [P in ProductId]: `${P}:${TierId<P>}` }[ProductId];

export type SubscriptionStatus = (typeof subscriptions.$inferSelect)["status"];

/** What one project is entitled to. Same shape on server and client. */
export type Entitlement = {
  repoId: number;
  plan: PlanKey;
  product: ProductId;
  /** e.g. "Website plan", "Agency · Launch" */
  label: string;
  /** Stripe state of the project's subscription; null when on website:free. */
  status: SubscriptionStatus | null;
  priceId: string | null;
  cancelAtPeriodEnd: boolean;
  features: Feature[];
  limits: Limits;
};

export const FREE_PLAN = "website:free" satisfies PlanKey;

/** Plans a user can buy themselves from the hub (the rest are sales-led). */
export const SELF_SERVE_PLANS = ["website:paid"] as const satisfies readonly PlanKey[];
export type SelfServePlan = (typeof SELF_SERVE_PLANS)[number];

// ─── Helpers ────────────────────────────────────────────────────

/** Statuses that keep a subscription's tier unlocked (past_due = card retry grace). */
export const LIVE_STATUSES: readonly SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
];

const tierDef = (plan: PlanKey): TierDef => {
  const [product, tier] = plan.split(":") as [ProductId, string];
  return (PLANS[product].tiers as Record<string, TierDef>)[tier]!;
};

/** Every plan in the catalog, in file order. */
export const PLAN_KEYS = (Object.keys(PLANS) as ProductId[]).flatMap((product) =>
  Object.keys(PLANS[product].tiers).map((tier) => `${product}:${tier}` as PlanKey)
);

/** The tier a Stripe recurring price belongs to, or null if it is not ours. */
export const planForPrice = (
  priceId: string | null | undefined
): PlanKey | null => {
  if (!priceId) return null;
  return (
    PLAN_KEYS.find((plan) => tierDef(plan).prices?.recurring === priceId) ?? null
  );
};

/** Stripe price ids for a tier (null when the tier isn't sold in this mode). */
export const pricesFor = (plan: PlanKey) => {
  const prices = tierDef(plan).prices;
  return prices?.recurring ? prices : null;
};

export const planLabel = (plan: PlanKey): string => {
  const [product] = plan.split(":") as [ProductId];
  const tier = tierDef(plan);
  return product === "website" ? tier.label : `${PLANS[product].label} · ${tier.label}`;
};

/**
 * Resolves a project's entitlement from its subscription row (or none).
 * A row that isn't live, or whose price isn't in the catalog, falls back to
 * website:free; the Stripe state is still reported so billing can show it.
 */
export const entitlementFor = (
  repoId: number,
  row: {
    status: SubscriptionStatus;
    priceId: string | null;
    cancelAtPeriodEnd: boolean;
  } | null
): Entitlement => {
  const live = row && LIVE_STATUSES.includes(row.status);
  const plan = (live && planForPrice(row.priceId)) || FREE_PLAN;
  const tier = tierDef(plan);
  return {
    repoId,
    plan,
    product: plan.split(":")[0] as ProductId,
    label: planLabel(plan),
    status: row?.status ?? null,
    priceId: row?.priceId ?? null,
    cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
    features: [...tier.features],
    limits: { ...NO_LIMITS, ...tier.limits },
  };
};

/** The one access rule: admins get everything, everyone else gets their tier. */
export const canUse = (
  entitlement: Pick<Entitlement, "features"> | null | undefined,
  feature: Feature,
  options?: { isAdmin?: boolean }
): boolean =>
  Boolean(options?.isAdmin) ||
  (entitlement ?? entitlementFor(0, null)).features.includes(feature);
