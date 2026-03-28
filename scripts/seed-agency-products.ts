/**
 * Run with: npx tsx scripts/seed-agency-products.ts
 * From the repo root. Requires POLAR_ACCESS_TOKEN and POLAR_SERVER in env.
 */

import * as path from "path";
import { Polar } from "@polar-sh/sdk";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_SERVER as "sandbox" | "production",
});

const AGENCY_PRODUCTS = [
  {
    name: "Starter: Website & Hosting",
    priceAmount: 9900, // $99 in cents
    description: `- Custom website — 3 pages included
- Managed hosting (Vercel)
- SSL certificate
- Monthly maintenance & support

Your website built, deployed, and maintained — no effort required on your end. Includes a professionally designed site with up to 3 pages, hosted on fast global infrastructure with SSL and 99.9% uptime. Monthly maintenance covers updates, bug fixes, and minor copy changes. Add extra pages at $20/month each.`,
  },
  {
    name: "Essential: Website, Hosting, Domain & Email",
    priceAmount: 14900, // $149 in cents
    description: `- Custom website — 3 pages included
- Managed hosting (Vercel)
- Custom domain registration & renewal
- Professional email (you@yourdomain.com)
- SSL certificate
- Monthly maintenance & support

Everything in Starter, plus your own domain and a professional email address. We register and renew the domain on your behalf, and set up email so you can communicate with the world as your brand. Ideal for new businesses that need a complete online presence out of the box. Add extra pages at $20/month each.`,
  },
  {
    name: "Agency: Full Service",
    priceAmount: 30000, // $300 in cents
    description: `- Custom website — 3 pages included
- Managed hosting, domain & email
- SEO optimization
- Analytics & monthly reporting
- Priority support & unlimited change requests
- Social media asset delivery

The complete agency experience. Everything in Essential, plus ongoing SEO work, monthly performance reports, priority response time, and unlimited content or design change requests. We also deliver ready-to-use social media assets aligned with your brand. For businesses that want to grow and don't want to think about their digital presence. Add extra pages at $20/month each.`,
  },
  {
    name: "Extra Page Add-on",
    priceAmount: 2000, // $20 in cents
    description: `- +1 additional page to your existing plan
- Can be purchased multiple times
- Applies to any active plan

Need more than 3 pages? Add one page at a time to your plan. Each add-on gives you one extra page, built and maintained as part of your existing subscription. Purchase multiples to add as many pages as you need.`,
  },
];

async function main() {
  console.log(
    `Creating ${AGENCY_PRODUCTS.length} products in Polar (${process.env.POLAR_SERVER})...\n`
  );

  for (const p of AGENCY_PRODUCTS) {
    try {
      const result = await polar.products.create({
        name: p.name,
        description: p.description,
        prices: [
          {
            amountType: "fixed",
            priceAmount: p.priceAmount,
            priceCurrency: "usd",
          },
        ],
        recurringInterval: "month",
        metadata: {
          project: "AGENCY",
        },
      });
      console.log(`✓  ${result.name}  (id: ${result.id})`);
    } catch (err) {
      console.error(`✗  ${p.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\nDone. Products will sync to your DB via webhook.");
}

main();
