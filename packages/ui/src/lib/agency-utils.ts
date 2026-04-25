import { z } from "zod";

import { AgencyServiceSchema } from "@workspace/trpc/routers/types/agency";

import { formatPrice } from "./utils";

// ─── Service catalog ──────────────────────────────────────────────────────────

export type ServiceCategory = "Package" | "Infrastructure" | "Modules" | "Admin";

export type ServiceDefinition = {
  id: string;
  label: string;
  description: string;
  defaultPrice: number; // in cents
  category: ServiceCategory;
};

export const STARTER_SERVICE_ID = "starter";
export const STARTER_PRICE = 14900; // $149.00/mo

export const SERVICE_CATALOG: ServiceDefinition[] = [
  // Package — auto-included, cannot be removed
  {
    id: STARTER_SERVICE_ID,
    label: "Starter Package",
    description:
      "5-page website build, managed hosting, domain management, and contact form with email forwarding.",
    defaultPrice: STARTER_PRICE,
    category: "Package",
  },

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

  // Modules — enabled via the client project config
  {
    id: "blog",
    label: "Blog",
    description:
      "MDX-powered blog with authoring, tags, and SEO-friendly routing.",
    defaultPrice: 2900,
    category: "Modules",
  },
  {
    id: "contact",
    label: "Contact",
    description:
      "Contact form wired to the centralized submission API with email forwarding.",
    defaultPrice: 1500,
    category: "Modules",
  },
  {
    id: "payments",
    label: "Payments",
    description:
      "Polar-powered checkout, subscriptions, and webhook handling.",
    defaultPrice: 3900,
    category: "Modules",
  },
  {
    id: "discounts",
    label: "Discounts",
    description:
      "Promo codes, percentage and fixed-amount discounts tied to checkout.",
    defaultPrice: 1900,
    category: "Modules",
  },
  {
    id: "upload",
    label: "Uploads",
    description:
      "S3-backed file uploads with presigned URLs and media handling.",
    defaultPrice: 1900,
    category: "Modules",
  },
  {
    id: "auth",
    label: "Authentication",
    description:
      "Better Auth with email/password, OAuth, and session management.",
    defaultPrice: 2900,
    category: "Modules",
  },
  {
    id: "settings",
    label: "User Settings",
    description:
      "Account settings, profile management, and preferences surface.",
    defaultPrice: 1500,
    category: "Modules",
  },
  {
    id: "email",
    label: "Email",
    description:
      "Transactional email delivery with templated React Email components.",
    defaultPrice: 2900,
    category: "Modules",
  },

  {
    id: "cron",
    label: "Cron Jobs",
    description:
      "Vercel-powered scheduled tasks with job registry and config-driven validation.",
    defaultPrice: 2900,
    category: "Modules",
  },

  // Admin dashboard
  {
    id: "admin",
    label: "Admin Dashboard",
    description:
      "Private admin area for the client — authentication, layout, and navigation.",
    defaultPrice: 4900,
    category: "Admin",
  },
  {
    id: "admin_users",
    label: "Admin: Users",
    description:
      "User management inside the admin dashboard — list, search, roles.",
    defaultPrice: 1900,
    category: "Admin",
  },
  {
    id: "admin_products",
    label: "Admin: Products",
    description:
      "Product management inside the admin dashboard — CRUD and pricing.",
    defaultPrice: 1900,
    category: "Admin",
  },
  {
    id: "admin_media",
    label: "Admin: Media",
    description:
      "Media library inside the admin dashboard — uploads, browsing, deletion.",
    defaultPrice: 1900,
    category: "Admin",
  },
];

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Package",
  "Infrastructure",
  "Modules",
  "Admin",
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
