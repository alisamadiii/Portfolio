/**
 * Run with: /path/to/tsx scripts/update-agency-descriptions.ts
 * Updates existing agency product descriptions in Polar.
 */

import * as path from "path";
import { Polar } from "@polar-sh/sdk";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_SERVER as "sandbox" | "production",
});

const LEGAL = `---

**Managed Digital Services Agreement — AliSamadii.LLC**

This subscription is a managed digital services agreement between the client and AliSamadii.LLC, a software development and online technology services company based in Portland, OR.

By proceeding with this checkout, the client authorizes AliSamadii.LLC to provision, configure, and manage the following services on their behalf.

**Included with all plans:**

- Dedicated virtual payment card for service billing
- Multi-page website design and development (based on provided template)
- Admin panel for basic content management
- Ongoing website updates and maintenance
- Website hosting provisioning and uptime management
- Business email account setup and administration
- Domain registration, DNS configuration, and renewal
- Priority technical support via agency@alisamadii.com

All services are managed end-to-end by AliSamadii.LLC. The client is not required to create or maintain any third-party accounts. Service credentials and access will be securely managed and made available upon request.

**Please note:** This is a fully managed service subscription. The source code, underlying codebase, and all proprietary development assets remain the exclusive intellectual property of AliSamadii.LLC. This subscription does not include ownership, transfer, or distribution of source code. The client is subscribing to a continuous, professionally managed web presence — not a one-time deliverable. Our team handles all technical aspects so you can focus entirely on running your business without worrying about hosting, code, or infrastructure.

If you are interested in a custom-built website with full source code ownership, please reach out to discuss a separate development project tailored to your needs.

For questions or support, contact agency@alisamadii.com.`;

const UPDATES = [
  {
    id: "0f3a746b-d169-4ffb-963f-0447199c3d7e",
    name: "Starter: Website & Hosting",
    description: `- Custom website — 3 pages included
- Managed hosting (Vercel)
- SSL certificate
- Monthly maintenance & support

Your website built, deployed, and maintained — no effort required on your end. Includes a professionally designed site with up to 3 pages, hosted on fast global infrastructure with SSL and 99.9% uptime. Monthly maintenance covers updates, bug fixes, and minor copy changes. Add extra pages at $20/month each.

${LEGAL}`,
  },
  {
    id: "3f53efbf-4b5e-4e25-a664-95cdd575d052",
    name: "Essential: Website, Hosting, Domain & Email",
    description: `- Custom website — 3 pages included
- Managed hosting (Vercel)
- Custom domain registration & renewal
- Professional email (you@yourdomain.com)
- SSL certificate
- Monthly maintenance & support

Everything in Starter, plus your own domain and a professional email address. We register and renew the domain on your behalf, and set up email so you can communicate with the world as your brand. Ideal for new businesses that need a complete online presence out of the box. Add extra pages at $20/month each.

${LEGAL}`,
  },
  {
    id: "8941f93c-fc8d-4b30-bd5a-7cf699465dca",
    name: "Agency: Full Service",
    description: `- Custom website — 3 pages included
- Managed hosting, domain & email
- SEO optimization
- Analytics & monthly reporting
- Priority support & unlimited change requests
- Social media asset delivery

The complete agency experience. Everything in Essential, plus ongoing SEO work, monthly performance reports, priority response time, and unlimited content or design change requests. We also deliver ready-to-use social media assets aligned with your brand. For businesses that want to grow and don't want to think about their digital presence. Add extra pages at $20/month each.

${LEGAL}`,
  },
  {
    id: "8ba8d111-d37a-4207-ba22-860b3b02db0e",
    name: "Extra Page Add-on",
    description: `- +1 additional page to your existing plan
- Can be purchased multiple times
- Applies to any active plan

Need more than 3 pages? Add one page at a time to your plan. Each add-on gives you one extra page, built and maintained as part of your existing subscription. Purchase multiples to add as many pages as you need.`,
  },
];

async function main() {
  console.log(
    `Updating ${UPDATES.length} products in Polar (${process.env.POLAR_SERVER})...\n`
  );

  for (const p of UPDATES) {
    try {
      await polar.products.update({
        id: p.id,
        productUpdate: { description: p.description },
      });
      console.log(`✓  ${p.name}`);
    } catch (err) {
      console.error(`✗  ${p.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\nDone. Changes will sync to your DB via webhook.");
}

main();
