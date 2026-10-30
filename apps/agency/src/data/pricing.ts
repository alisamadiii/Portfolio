// ═══════════════════════════════════════════════════════════════
//  PRICING CONFIG — canonical source of truth (build-time)
// ═══════════════════════════════════════════════════════════════
//
// The agency sells one offer: a growth partnership (custom website + managed
// Google Ads) in three monthly tiers. Every page, FAQ, schema block and
// llms.txt reads from here so prices never drift. No self-serve checkout;
// every plan routes to /quote?plan=<id>.
//
// Ad spend is NOT included: the client pays Google directly. `adSpendCap` is
// the monthly spend each tier's management fee covers.

export type PlanId = "launch" | "growth" | "scale";

export type Plan = {
  id: PlanId;
  name: string;
  monthly: number;
  adSpendCap: number;
  featured?: boolean;
  blurb: string;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "launch",
    name: "Launch",
    monthly: 2500,
    adSpendCap: 3000,
    blurb:
      "For a business ready to turn on paid leads for the first time. One focused campaign, one site built to convert it.",
    features: [
      "Custom website, hosting & care",
      "1 Google Ads campaign, manages up to $3k/mo in ads",
      "Form & GA4 conversion tracking",
      "Home page + 1 landing page",
      "Monthly performance report",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    monthly: 3500,
    adSpendCap: 6000,
    featured: true,
    blurb:
      "For a business with several services to sell. A landing page and campaign for each, with every call tracked.",
    features: [
      "Everything in Launch",
      "Multiple campaigns, manages up to $6k/mo in ads",
      "Call tracking on every lead source",
      "A landing page for each service",
      "Local Services Ads setup",
      "Biweekly strategy call",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    monthly: 4500,
    adSpendCap: 10000,
    blurb:
      "For a business covering several cities or locations that wants the whole local search page working for it.",
    features: [
      "Everything in Growth",
      "Unlimited campaigns, manages up to $10k/mo in ads",
      "Landing pages per service & location",
      "Local SEO & Google Business Profile",
      "Weekly strategy call",
    ],
  },
];

export const TERMS = { setup: 0, minimumMonths: 6 };

export const FROM_PRICE = PLANS[0].monthly;

// Website only, no ads — the secondary offer under the growth tiers for
// businesses that just need a site. Routes to /quote?plan=website.
export const WEBSITE_ONLY = {
  id: "website",
  name: "Website only",
  setup: 699,
  monthly: 25,
  blurb:
    "Just need a great website, no ads? We design and build it, then set it up in your own accounts.",
  features: [
    "Custom design & development",
    "Client Hub: edit anything with AI",
    "Set up in your own accounts: domain, hosting, code",
    "Essential SEO, analytics & speed reports",
  ],
} as const;

export const PRICING = {
  // E-commerce Storefront — separate offer on /ecommerce only. Published as
  // "$1,500 setup + $120/mo"; CTAs route to /quote?plan=ecommerce.
  ecommerce: { setup: 1500, monthly: 120 },
};

// ─── Shared helpers ─────────────────────────────────────────────

export const fmtPrice = (amount: number) =>
  "$" + amount.toLocaleString("en-US");

// "$2,500/mo"
export const fmtMonthly = (amount: number) => `${fmtPrice(amount)}/mo`;

// One line used under every pricing block.
export const TERMS_LINE = `$${TERMS.setup} setup · Website included · ${TERMS.minimumMonths}-month minimum, then month-to-month · Ad spend paid to Google directly`;

// Growth-plan guarantee. Lead guarantee = walk-away (no cash refund): the
// lead target is set per client at kickoff (~half the Keyword Planner
// forecast) and written into the agreement. Process guarantee = free month.
export const GUARANTEE = {
  days: 90,
  launchDays: 14,
  reportDay: 5,
  headline: "Hit the lead number, or walk away",
  leads:
    "Before launch we agree in writing on how many qualified leads your campaigns should bring in. If we miss it within 90 days, cancel the 6-month minimum and keep your website and Google Ads account.",
  process:
    "Site and ads live within 14 days, every lead tracked, and your report by the 5th of each month. If we miss any of these, that month is free.",
  fine: "A qualified lead is a tracked call of 60+ seconds or a real form inquiry. Applies to growth plans while ad spend stays at the agreed level and leads are answered in business hours.",
};
