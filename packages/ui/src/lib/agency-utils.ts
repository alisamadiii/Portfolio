import { z } from "zod";

import { AgencyServiceSchema } from "@workspace/trpc/routers/admin/agency/products";

import { formatPrice } from "./utils";

// ─── Service catalog ──────────────────────────────────────────────────────────

export type ServiceCategory = "Core" | "Development" | "Growth" | "Advanced";

export type ServiceDefinition = {
  id: string;
  label: string;
  description: string;
  defaultPrice: number; // in cents
  category: ServiceCategory;
};

export const SERVICE_CATALOG: ServiceDefinition[] = [
  // Core
  {
    id: "payment_card",
    label: "Virtual Payment Card",
    description:
      "Dedicated virtual card used exclusively for billing third-party services on the client's behalf.",
    defaultPrice: 0,
    category: "Core",
  },
  {
    id: "hosting",
    label: "Hosting & Uptime Management",
    description:
      "Website hosting provisioning, server configuration, uptime monitoring, and incident response.",
    defaultPrice: 2900,
    category: "Core",
  },
  {
    id: "domain",
    label: "Domain & DNS Management",
    description:
      "Domain registration, DNS configuration, SSL certificate, and annual renewal management.",
    defaultPrice: 1500,
    category: "Core",
  },
  {
    id: "business_email",
    label: "Business Email",
    description:
      "Professional business email account setup, configuration, and ongoing administration.",
    defaultPrice: 1500,
    category: "Core",
  },
  {
    id: "maintenance",
    label: "Ongoing Maintenance",
    description:
      "Regular website updates, dependency patches, content changes, and bug fixes.",
    defaultPrice: 9900,
    category: "Core",
  },
  {
    id: "priority_support",
    label: "Priority Technical Support",
    description:
      "Dedicated priority support via agency@alisamadii.com with guaranteed response time.",
    defaultPrice: 4900,
    category: "Core",
  },
  // Development
  {
    id: "website_design",
    label: "Website Design & Development",
    description:
      "Multi-page website design and development based on provided template, fully customized for the client.",
    defaultPrice: 49900,
    category: "Development",
  },
  {
    id: "admin_panel",
    label: "Admin Panel",
    description:
      "Custom internal admin panel for basic content management — update text, images, and pages without touching code.",
    defaultPrice: 19900,
    category: "Development",
  },
  {
    id: "contact_form",
    label: "Contact Form & Email Automation",
    description:
      "Fully functional contact form with email forwarding, auto-responders, and spam protection.",
    defaultPrice: 4900,
    category: "Development",
  },
  {
    id: "blog_cms",
    label: "Blog / CMS Setup",
    description:
      "Blog system or headless CMS integration with a simple editor interface for the client.",
    defaultPrice: 14900,
    category: "Development",
  },
  {
    id: "custom_api",
    label: "Custom API / Third-Party Integration",
    description:
      "Integration with external APIs, payment gateways, CRMs, or any third-party services.",
    defaultPrice: 14900,
    category: "Development",
  },
  // Growth
  {
    id: "seo",
    label: "SEO Setup & Optimization",
    description:
      "Technical SEO, metadata, sitemap, structured data, Core Web Vitals optimization, and search console setup.",
    defaultPrice: 9900,
    category: "Growth",
  },
  {
    id: "analytics",
    label: "Analytics Integration",
    description:
      "Google Analytics 4 or privacy-first analytics (Plausible) setup with goal tracking and reporting.",
    defaultPrice: 1900,
    category: "Growth",
  },
  {
    id: "ecommerce",
    label: "E-Commerce Integration",
    description:
      "Product catalogue, shopping cart, and payment checkout integration (Stripe or Polar).",
    defaultPrice: 19900,
    category: "Growth",
  },
  {
    id: "social_media",
    label: "Social Media Integration",
    description:
      "Live social feed embeds, share buttons, Open Graph tags, and social preview optimization.",
    defaultPrice: 2900,
    category: "Growth",
  },
  // Advanced
  {
    id: "performance",
    label: "Performance Audit & Optimization",
    description:
      "Lighthouse audit, image optimization, lazy loading, caching strategy, and bundle size improvements.",
    defaultPrice: 7400,
    category: "Advanced",
  },
  {
    id: "mobile_app",
    label: "Mobile App Development",
    description:
      "React Native mobile app development for iOS and Android, sharing the same backend.",
    defaultPrice: 99900,
    category: "Advanced",
  },
  {
    id: "ai_integration",
    label: "AI Feature Integration",
    description:
      "Integration of AI features using the Claude API or OpenAI — chatbots, content generation, smart search.",
    defaultPrice: 19900,
    category: "Advanced",
  },
];

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Core",
  "Development",
  "Growth",
  "Advanced",
];

/** Resolves a service id to its human-readable label. Falls back to the id itself. */
const serviceLabel = (id: string): string =>
  SERVICE_CATALOG.find((s) => s.id === id)?.label ?? id;

// ─── Tiered extra-page pricing (amounts in cents) ─────────────────────────────
const EXTRA_PAGE_TIERS = [
  { pages: 5, pricePerPage: 3000 }, // pages 1–5:   $30.00 each
  { pages: 5, pricePerPage: 4999 }, // pages 6–10:  $49.99 each
  { pages: 5, pricePerPage: 7000 }, // pages 11–15: $70.00 each
  { pages: 5, pricePerPage: 9000 }, // pages 16–20: $90.00 each
  { pages: 5, pricePerPage: 11000 }, // pages 21–25: $110.00 each
] as const;

export const MAX_EXTRA_PAGES = EXTRA_PAGE_TIERS.reduce(
  (s, t) => s + t.pages,
  0
); // 25

/** Returns the total extra cost in cents for N additional pages. */
export function calcExtraPagesCost(extraPages: number): number {
  let remaining = Math.min(extraPages, MAX_EXTRA_PAGES);
  let total = 0;
  for (const tier of EXTRA_PAGE_TIERS) {
    if (remaining <= 0) break;
    const count = Math.min(remaining, tier.pages);
    total += count * tier.pricePerPage;
    remaining -= count;
  }
  return total;
}

/** Returns the price per page (in cents) for the Nth extra page (1-indexed). */
export function priceForExtraPage(n: number): number {
  let remaining = n;
  for (const tier of EXTRA_PAGE_TIERS) {
    if (remaining <= tier.pages) return tier.pricePerPage;
    remaining -= tier.pages;
  }
  return EXTRA_PAGE_TIERS[EXTRA_PAGE_TIERS.length - 1].pricePerPage;
}

export const generateDescription = (
  services: z.infer<typeof AgencyServiceSchema>[],
  isOneTime: boolean
): string =>
  services
    .map(
      (s) =>
        `- ${serviceLabel(s.name)}: $${formatPrice(s.price)}${isOneTime ? "" : "/monthly"}`
    )
    .join("\n");
