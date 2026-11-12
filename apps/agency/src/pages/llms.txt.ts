import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { cities } from "../data/cities";
import { getDocsTree } from "../data/docs";
import { FROM_PRICE, GUARANTEE, PLANS, TERMS, CARE, NEWSLETTER, WEBSITE_PLANS, fmtPrice } from "../data/pricing";

// Plain-markdown summary for LLMs / answer engines. Prices come from
// src/data/pricing.ts so this never drifts from the site.
export const GET: APIRoute = async () => {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime()
  );
  const writing = posts
    .map(
      (p) =>
        `- [${p.data.title}](https://www.alisamadii.com/blog/${p.id}) — ${p.data.description}`
    )
    .join("\n");
  const locations = cities
    .map(
      (c) =>
        `- [Lead generation & web design in ${c.name}, FL](https://www.alisamadii.com/locations/${c.slug})`
    )
    .join("\n");
  const docsTree = await getDocsTree();
  const docsList = docsTree
    .flatMap((g) =>
      g.docs.map(
        (d) =>
          `- [${g.label}: ${d.data.title}](https://www.alisamadii.com/docs/${d.id}) — ${d.data.description}`
      )
    )
    .join("\n");

  const body = `# Ali Samadi Agency

> Lead generation agency for businesses everywhere. We run the Google Ads
> that make the phone ring, build the website that turns clicks into booked
> jobs, and bring past customers back with email. Every call and form is
> tracked. The client owns the site and the ad account. Works with
> businesses in every location, fully online. Contact: a@alisamadii.com.

## Pages

- [Home: Websites for Small Businesses](https://www.alisamadii.com/): a custom website, designed, built, and set up in your own accounts, editable with AI through Client Hub. Features: custom design and development, Client Hub AI editing, hosting and SSL, 24/7 uptime monitoring, own-account setup, SEO, analytics and speed reports, Google Business Profile optimization, NFC review cards and QR review links, Shopify stores, web apps, AI receptionist and chatbot. Already on Shopify, Wix or Square: a custom hand-coded website connected to that account, so products, checkout, bookings, forms and payments keep running there and the site is edited in Client Hub. Custom quote after a free consultation.
- [Lead Generation](https://www.alisamadii.com/lead-generation): the growth partnership. Managed Google Ads plus a website built to convert, every call and form tracked to its source, a 90-day lead guarantee, and FAQ.
- [About](https://www.alisamadii.com/about): who we are, how we bring in leads, the founder.
- [Work](https://www.alisamadii.com/work): websites built for clients and concept projects.
- [Services](https://www.alisamadii.com/services): everything we offer.
- [Pricing](https://www.alisamadii.com/pricing): plans and how pricing works.
- [Contact](https://www.alisamadii.com/contact): email, booking, phone.
- [Blog](https://www.alisamadii.com/blog): articles on Google Ads, local search, and websites that convert.
- [Docs](https://www.alisamadii.com/docs): plain-language guides — the Client Hub dashboard, the build/handoff process, and client ownership.
- [Business Newsletter](https://www.alisamadii.com/newsletter): a managed email newsletter for businesses, own domain, branded templates, writing and sending handled. ${fmtPrice(NEWSLETTER.monthly)}/mo add-on.
- [Pest Control Lead Generation](https://www.alisamadii.com/pest-control): managed Google Ads for pest control companies plus a website with click-to-call, per-pest and per-city pages, review walls, and booking forms. From ${fmtPrice(FROM_PRICE)}/mo.

## Services

- [Google Ads management](https://www.alisamadii.com/services/google-ads): campaigns, Local Services Ads, landing pages, call tracking, monthly optimization
- [Web development](https://www.alisamadii.com/services/web-development): websites built to convert leads into calls and booked jobs
- [SEO & analytics](https://www.alisamadii.com/services/seo-analytics): local search visibility and lead tracking
- [Email newsletter](https://www.alisamadii.com/newsletter): bring past customers back for repeat business
- [E-commerce](https://www.alisamadii.com/services/ecommerce): custom Shopify storefronts, custom quote
- [Website management](https://www.alisamadii.com/services/website-management): Client Hub editing, or the done-for-you Care plan
- [UI/UX design](https://www.alisamadii.com/services/ui-ux-design): layouts designed to convert
- [Brand identity](https://www.alisamadii.com/services/brand-identity): logo, color, typography systems
- [Custom web apps](https://www.alisamadii.com/services/custom-web-apps): dashboards, auth, databases

## Pricing

Every growth plan is a custom website plus fully managed Google Ads. ${fmtPrice(TERMS.setup)} setup, ${TERMS.minimumMonths}-month minimum, then month-to-month. Ad spend is not included; Google bills it to the client directly.

${PLANS.map((p) => `- ${p.name}: ${fmtPrice(p.monthly)}/mo, manages up to ${fmtPrice(p.adSpendCap)}/mo in ad spend. ${p.features.join("; ")}.`).join("\n")}
- Website only (no ads): scoped per project around the features picked, custom quote after a free consultation. Core features: ${WEBSITE_PLANS[0].features.join("; ")}. Local growth add-ons: ${WEBSITE_PLANS[1].features.slice(1).join("; ")}. Also: custom websites on Shopify, Wix and Square (their backend keeps checkout, bookings and payments), web apps and client portals, AI receptionist and chatbot.
- ${CARE.name} plan (optional, replaces the Client Hub monthly): ${fmtPrice(CARE.monthly)}/mo. ${CARE.features.join("; ")}. ${CARE.fine}
- ${NEWSLETTER.name} (optional add-on): ${fmtPrice(NEWSLETTER.monthly)}/mo. ${NEWSLETTER.features.join("; ")}.
- E-commerce storefronts, web apps and integrations: custom quote after a discovery call.
- Custom: fully scoped projects (admin panels, auth, databases), contact for a quote.

Guarantee (growth plans): ${GUARANTEE.leads} ${GUARANTEE.process} ${GUARANTEE.fine}

Terms and privacy pages are always included free.

## Locations

Serving businesses in every location remotely. City pages below.

${locations}

## Docs

Guides for clients: how the Client Hub works (AI editing, analytics, emails,
speed tests), the step-by-step build process, and the ownership/handoff
model where every account is in the client's name and ownership transfers in full once the project is paid.

${docsList}

## Writing

${writing}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
