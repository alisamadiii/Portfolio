import { z } from "zod";

import { AgencyServiceSchema } from "@workspace/trpc/routers/admin/agency/products";

import { company } from "./company";
import { formatPrice } from "./utils";

// Tiered extra-page pricing (amounts in cents)
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
): string => {
  const total = services.reduce((sum, s) => sum + s.price, 0);

  const priceSuffix = isOneTime ? "" : `/${isOneTime ? "one-time" : "monthly"}`;

  const serviceLines = services
    .map((s) => `- ${s.name}: $${formatPrice(s.price)}${priceSuffix}`)
    .join("\n");

  const email = `[${company.agencyEmail}](mailto:${company.agencyEmail})`;
  const phone = `[${company.phone}](tel:${company.phone.replace(/\s/g, "")})`;

  const agreementType = isOneTime
    ? "a one-time digital services agreement"
    : "a managed digital services agreement";

  const authorizationText = isOneTime
    ? "to deliver the following services"
    : "to provision, configure, and manage the following services on their behalf";

  const totalLine = isOneTime
    ? `Total: **$${formatPrice(total)}** one-time payment.`
    : `Total: **$${formatPrice(total)}** billed monthly.`;

  return [
    `This ${isOneTime ? "purchase" : "subscription"} is ${agreementType} between the client and **AliSamadii.LLC**, a software development and online technology services company based in Portland, OR.`,
    ``,
    `By proceeding with this checkout, the client authorizes **AliSamadii.LLC** ${authorizationText}:`,
    ``,
    serviceLines,
    ``,
    ...(isOneTime
      ? []
      : [
          `Included with all plans:`,
          `- Dedicated virtual payment card for service billing`,
          `- Ongoing website updates and maintenance`,
          `- Business email account setup and administration`,
          `- Domain registration, DNS configuration, and renewal`,
          `- Priority technical support via ${email}`,
          ``,
        ]),
    totalLine,
    ``,
    `All services are managed end-to-end by **AliSamadii.LLC**. The client is not required to create or maintain any third-party accounts. Service credentials and access will be securely managed and made available upon request.`,
    ``,
    `For questions or support, contact ${email} or call ${phone}.`,
  ].join("\n\n");
};
