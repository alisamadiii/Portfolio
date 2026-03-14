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
