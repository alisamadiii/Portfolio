import { z } from "zod";

import { AgencyServiceSchema } from "@workspace/trpc/routers/admin/agency/products";

import { company } from "./company";
import { formatPrice } from "./utils";

export const generateDescription = (
  services: z.infer<typeof AgencyServiceSchema>[],
  recurringInterval: "month" | "year"
): string => {
  const interval = recurringInterval === "month" ? "monthly" : "annually";
  const total = services.reduce((sum, s) => sum + s.price, 0);

  const serviceLines = services
    .map(
      (s) =>
        `  • ${s.name}: ${formatPrice(s.price)}/${recurringInterval === "month" ? "mo" : "yr"}`
    )
    .join("<br />");

  const email = `<a href="mailto:${company.agencyEmail}" class="underline font-semibold">${company.agencyEmail}</a>`;
  const phone = `<a href="tel:${company.phone.replace(/\s/g, "")}" class="underline font-semibold">${company.phone}</a>`;

  return [
    `This subscription is a managed digital services agreement between the client and <strong>AliSamadii.LLC</strong>, a software development and online technology services company based in Portland, OR.`,
    ``,
    `By proceeding with this checkout, the client authorizes <strong>AliSamadii.LLC</strong> to provision, configure, and manage the following services on their behalf:`,
    ``,
    serviceLines,
    ``,
    `Included with all plans:`,
    `  • Dedicated virtual payment card for service billing`,
    `  • Ongoing website updates and maintenance`,
    `  • Business email account setup and administration`,
    `  • Domain registration, DNS configuration, and renewal`,
    `  • Priority technical support via ${email}`,
    ``,
    `Total: <strong class="text-base">${formatPrice(total)}</strong> billed ${interval}.`,
    ``,
    `All services are managed end-to-end by <strong>AliSamadii.LLC</strong>. The client is not required to create or maintain any third-party accounts. Service credentials and access will be securely managed and made available upon request.`,
    ``,
    `For questions or support, contact ${email} or call ${phone}.`,
  ].join("<br />");
};
