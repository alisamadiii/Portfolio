import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { cities } from "../data/cities";
import { getDocsTree } from "../data/docs";
import { FROM_PRICE, GUARANTEE, PLANS, TERMS, WEBSITE_ONLY, fmtPrice } from "../data/pricing";

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
> businesses in every location, fully online. Contact: agency@alisamadii.com.

## Pages

- [Home](https://www.alisamadii.com/): how we bring in leads, plans, and FAQ.
- [About](https://www.alisamadii.com/about): who we are, how we bring in leads, the founder.
- [Work](https://www.alisamadii.com/work): websites built for clients and concept projects.
- [Services](https://www.alisamadii.com/services): everything we offer.
- [Pricing](https://www.alisamadii.com/pricing): plans and how pricing works.
- [Contact](https://www.alisamadii.com/contact): email, booking, phone.
- [Blog](https://www.alisamadii.com/blog): articles on Google Ads, local search, and websites that convert.
- [Docs](https://www.alisamadii.com/docs): plain-language guides — the Client Hub dashboard, the build/handoff process, and client ownership.
- [Websites for Small Businesses](https://www.alisamadii.com/websites): a custom website without ads, designed, built, and set up in your own accounts, editable with AI through Client Hub. ${fmtPrice(WEBSITE_ONLY.setup)} setup + ${fmtPrice(WEBSITE_ONLY.monthly)}/mo.
- [Business Newsletter](https://www.alisamadii.com/newsletter): a managed email newsletter for businesses, own domain, branded templates, writing and sending handled. Quoted per business, no published price.
- [Pest Control Lead Generation](https://www.alisamadii.com/pest-control): managed Google Ads for pest control companies plus a website with click-to-call, per-pest and per-city pages, review walls, and booking forms. From ${fmtPrice(FROM_PRICE)}/mo.

## Services

- [Google Ads management](https://www.alisamadii.com/services/google-ads): campaigns, Local Services Ads, landing pages, call tracking, monthly optimization
- [Web development](https://www.alisamadii.com/services/web-development): websites built to convert leads into calls and booked jobs
- [SEO & analytics](https://www.alisamadii.com/services/seo-analytics): local search visibility and lead tracking
- [Email newsletter](https://www.alisamadii.com/newsletter): bring past customers back for repeat business
- [E-commerce](https://www.alisamadii.com/services/ecommerce): custom Shopify storefronts
- [Website management](https://www.alisamadii.com/services/website-management): Client Hub editing + managed hosting
- [UI/UX design](https://www.alisamadii.com/services/ui-ux-design): layouts designed to convert
- [Brand identity](https://www.alisamadii.com/services/brand-identity): logo, color, typography systems
- [Custom web apps](https://www.alisamadii.com/services/custom-web-apps): dashboards, auth, databases

## Pricing

Every growth plan is a custom website plus fully managed Google Ads. ${fmtPrice(TERMS.setup)} setup, ${TERMS.minimumMonths}-month minimum, then month-to-month. Ad spend is not included; Google bills it to the client directly.

${PLANS.map((p) => `- ${p.name}: ${fmtPrice(p.monthly)}/mo, manages up to ${fmtPrice(p.adSpendCap)}/mo in ad spend. ${p.features.join("; ")}.`).join("\n")}
- ${WEBSITE_ONLY.name} (no ads): ${fmtPrice(WEBSITE_ONLY.setup)} setup + ${fmtPrice(WEBSITE_ONLY.monthly)}/mo. ${WEBSITE_ONLY.features.join("; ")}.
- Custom: fully scoped projects (admin panels, auth, databases), contact for a quote.

Guarantee (growth plans): ${GUARANTEE.leads} ${GUARANTEE.process} ${GUARANTEE.fine}

Terms and privacy pages are always included free.

## Locations

Serving businesses in every location remotely. City pages below.

${locations}

## Docs

Guides for clients: how the Client Hub works (AI editing, analytics, emails,
speed tests), the step-by-step build process, and the ownership/handoff
model where the client owns every account.

${docsList}

## Writing

${writing}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
