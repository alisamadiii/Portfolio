import { z } from "zod";

import { AgencyServiceSchema } from "@workspace/trpc/routers/admin/agency/products";

import { company } from "./company";
import { formatPrice } from "./utils";

export const generateDescription = (
  services: z.infer<typeof AgencyServiceSchema>[],
  isOneTime: boolean
): string => {
  const total = services.reduce((sum, s) => sum + s.price, 0);

  const priceSuffix = isOneTime ? "" : `/${isOneTime ? "one-time" : "monthly"}`;

  const serviceLines = services
    .map((s) => `  • ${s.name}: $${formatPrice(s.price)}${priceSuffix}`)
    .join("<br />");

  const email = `<a href="mailto:${company.agencyEmail}" class="underline font-semibold">${company.agencyEmail}</a>`;
  const phone = `<a href="tel:${company.phone.replace(/\s/g, "")}" class="underline font-semibold">${company.phone}</a>`;

  const agreementType = isOneTime
    ? "a one-time digital services agreement"
    : "a managed digital services agreement";

  const authorizationText = isOneTime
    ? "to deliver the following services"
    : "to provision, configure, and manage the following services on their behalf";

  const totalLine = isOneTime
    ? `Total: <strong class="text-base">$${formatPrice(total)}</strong> one-time payment.`
    : `Total: <strong class="text-base">$${formatPrice(total)}</strong> billed monthly.`;

  return [
    `This ${isOneTime ? "purchase" : "subscription"} is ${agreementType} between the client and <strong>AliSamadii.LLC</strong>, a software development and online technology services company based in Portland, OR.`,
    ``,
    `By proceeding with this checkout, the client authorizes <strong>AliSamadii.LLC</strong> ${authorizationText}:`,
    ``,
    serviceLines,
    ``,
    ...(isOneTime
      ? []
      : [
          `Included with all plans:`,
          `  • Dedicated virtual payment card for service billing`,
          `  • Ongoing website updates and maintenance`,
          `  • Business email account setup and administration`,
          `  • Domain registration, DNS configuration, and renewal`,
          `  • Priority technical support via ${email}`,
          ``,
        ]),
    totalLine,
    ``,
    `All services are managed end-to-end by <strong>AliSamadii.LLC</strong>. The client is not required to create or maintain any third-party accounts. Service credentials and access will be securely managed and made available upon request.`,
    ``,
    `For questions or support, contact ${email} or call ${phone}.`,
  ].join("<br />");
};
