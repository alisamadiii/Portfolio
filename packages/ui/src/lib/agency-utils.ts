import { z } from "zod";

import { AgencyServiceSchema } from "@workspace/trpc/routers/admin/agency/products";

import { formatPrice } from "./utils";

// ─── Service catalog ──────────────────────────────────────────────────────────

export type ServiceCategory = "Infrastructure" | "Development" | "Growth";

export type ServiceDefinition = {
  id: string;
  label: string;
  description: string;
  defaultPrice: number; // in cents
  category: ServiceCategory;
};

export const SERVICE_CATALOG: ServiceDefinition[] = [
  // Infrastructure
  {
    id: "hosting",
    label: "Hosting & Uptime Management",
    description:
      "Website hosting provisioning, server configuration, uptime monitoring, and incident response.",
    defaultPrice: 2900,
    category: "Infrastructure",
  },
  {
    id: "domain",
    label: "Domain & DNS Management",
    description:
      "Domain registration, DNS configuration, SSL certificate, and annual renewal management.",
    defaultPrice: 1500,
    category: "Infrastructure",
  },
  {
    id: "business_email",
    label: "Business Email",
    description:
      "Professional business email setup (Google Workspace/custom SMTP), configuration, and ongoing admin.",
    defaultPrice: 1500,
    category: "Infrastructure",
  },
  {
    id: "database",
    label: "Database Management",
    description:
      "Neon PostgreSQL provisioning, backups, and monitoring.",
    defaultPrice: 2900,
    category: "Infrastructure",
  },
  // Development
  {
    id: "website_design",
    label: "Website Design & Development",
    description:
      "Template-based multi-page website design and development (5 pages included), fully customized for the client.",
    defaultPrice: 7600,
    category: "Development",
  },
  {
    id: "web_app",
    label: "Web App Development",
    description:
      "Custom dashboards, client portals, SaaS tools — authentication, CRUD, third-party integrations.",
    defaultPrice: 19900,
    category: "Development",
  },
  {
    id: "contact_form",
    label: "Contact Form & Email Automation",
    description:
      "Fully functional contact form with email forwarding, auto-responders, and spam protection.",
    defaultPrice: 2900,
    category: "Development",
  },
  {
    id: "maintenance",
    label: "Ongoing Maintenance",
    description:
      "Regular website updates, dependency patches, content changes, and bug fixes.",
    defaultPrice: 6900,
    category: "Development",
  },
  // Growth
  {
    id: "seo",
    label: "SEO Setup & Optimization",
    description:
      "Technical SEO, metadata, sitemap, structured data, Core Web Vitals optimization, and search console setup.",
    defaultPrice: 4900,
    category: "Growth",
  },
  {
    id: "analytics",
    label: "Analytics Integration",
    description:
      "Google Analytics 4 or privacy-first analytics (Plausible) setup with goal tracking and reporting.",
    defaultPrice: 1500,
    category: "Growth",
  },
  {
    id: "priority_support",
    label: "Priority Technical Support",
    description:
      "Dedicated priority support via email with guaranteed response time.",
    defaultPrice: 3900,
    category: "Growth",
  },
];

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Infrastructure",
  "Development",
  "Growth",
];

/** Resolves a service id to its human-readable label. Falls back to the id itself. */
const serviceLabel = (id: string): string =>
  SERVICE_CATALOG.find((s) => s.id === id)?.label ?? id;

// ─── Tiered extra-page pricing (amounts in cents) ─────────────────────────────
const EXTRA_PAGE_TIERS = [
  { pages: 5, pricePerPage: 2500 }, // pages 1–5:   $25.00/mo each
  { pages: 5, pricePerPage: 4000 }, // pages 6–10:  $40.00/mo each
  { pages: 5, pricePerPage: 6000 }, // pages 11–15: $60.00/mo each
] as const;

export const MAX_EXTRA_PAGES = EXTRA_PAGE_TIERS.reduce(
  (s, t) => s + t.pages,
  0
); // 15

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
