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

// Website plans, no ads — the secondary offer under the growth tiers for
// businesses that just need a site. Every plan includes Client Hub at
// `monthly`; Care replaces it for clients who want edits done for them.
// Core keeps id "website" so existing /quote?plan=website links still work.
export type WebsitePlan = {
  id: "website" | "website-local";
  name: string;
  setup: number;
  monthly: number;
  featured?: boolean;
  blurb: string;
  features: string[];
};

export const WEBSITE_PLANS: WebsitePlan[] = [
  {
    id: "website",
    name: "Core",
    setup: 699,
    monthly: 25,
    blurb:
      "A fast custom website, built and set up in your own accounts, that you edit yourself with AI.",
    features: [
      "Custom design & development",
      "Client Hub: edit anything with AI",
      "Set up in your own accounts",
      "Essential SEO foundations",
      "Analytics & speed reports",
    ],
  },
  {
    id: "website-local",
    name: "Local Growth",
    setup: 1199,
    monthly: 25,
    featured: true,
    blurb:
      "Everything in Core, plus the local pieces that bring in calls: a tuned Google profile and more reviews.",
    features: [
      "Everything in Core",
      "Google Business Profile optimization",
      "NFC review card: customers tap to leave a review",
      "Review link & QR code for receipts and texts",
    ],
  },
];

// Lowest website price, for "From $699 + $25/mo" lines.
export const WEBSITE_FROM = WEBSITE_PLANS[0];

// Optional done-for-you care. Replaces the Client Hub monthly (not on top).
// Sales-led: invoiced manually, not a hub Stripe tier.
export const CARE = {
  id: "care",
  name: "Care",
  monthly: 99,
  blurb: "Rather not touch the site yourself? We keep an eye on it and make the edits for you.",
  features: [
    "Everything in Client Hub",
    "Uptime & speed monitoring",
    "Monthly performance report",
    "Up to 1 hour of edits done for you each month",
  ],
  fine: "Edits cover text, hours, prices and photo swaps. New pages, layout changes or new sections are quoted separately. Unused time does not roll over.",
} as const;

// Optional managed newsletter, on top of any website plan. Sales-led like
// Care: /quote?plan=newsletter, invoiced manually. Runs on our usesend (SES).
export const NEWSLETTER = {
  id: "newsletter",
  name: "Managed Newsletter Service",
  monthly: 199,
  blurb:
    "Want to turn past customers into a predictable revenue stream? We connect your site to our AWS-powered newsletter platform. You text us your monthly special or a job photo; we design, write, and send it for you. Your subscriber list is uncapped: no penalties or price hikes as it grows.",
  features: [
    "100% managed newsletter creation & sending",
    "Uncapped contact list, zero growth penalties",
    "Powered by reliable AWS infrastructure",
    "High-converting opt-in forms & pop-ups included",
    "Up to 1 custom broadcast sent for you each month",
  ],
} as const;

// E-commerce storefronts, web apps and booking integrations have no fixed
// price: custom quote after a discovery call, via /quote?plan=ecommerce.

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
