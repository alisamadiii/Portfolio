import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { cities } from "../data/cities";
import { fmtPrice, PRICING } from "../data/pricing";

// Plain-markdown summary for LLMs / answer engines. Prices come from
// src/data/pricing.ts so this never drifts from the site.
export const GET: APIRoute = async () => {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime()
  );
  const writing = posts
    .map(
      (p) =>
        `- [${p.data.title}](https://agency.alisamadii.com/blog/${p.id}) — ${p.data.description}`
    )
    .join("\n");
  const locations = cities
    .map(
      (c) =>
        `- [Web design in ${c.name}, FL](https://agency.alisamadii.com/locations/${c.slug})`
    )
    .join("\n");

  const body = `# Ali Samadi Agency

> Creative agency specializing in brand identity, web development, and digital
> strategy. Websites and web apps built from scratch on Next.js, React, and
> Postgres — custom, fast, and genuinely owned by the client, never templates.
> Based in Jacksonville, FL, USA. Contact: agency@alisamadii.com.

## Pages

- [Home](https://agency.alisamadii.com/): services, process, work, and about.
- [About](https://agency.alisamadii.com/about): who we are, how we work, the founder.
- [Work](https://agency.alisamadii.com/work): live client sites and concept projects.
- [Services](https://agency.alisamadii.com/services): everything we offer.
- [Pricing](https://agency.alisamadii.com/pricing): plans and how pricing works.
- [Contact](https://agency.alisamadii.com/contact): email, booking, phone.
- [Blog](https://agency.alisamadii.com/blog): articles on how websites get built.

## Services

- [Web development](https://agency.alisamadii.com/services/web-development) — custom sites on Next.js, React, Postgres
- [UI/UX design](https://agency.alisamadii.com/services/ui-ux-design) — interfaces designed to convert
- [Brand identity](https://agency.alisamadii.com/services/brand-identity) — logo, color, typography systems
- [SEO & analytics](https://agency.alisamadii.com/services/seo-analytics) — technical SEO + AI-search readiness
- [Website management](https://agency.alisamadii.com/services/website-management) — CMS access + managed hosting
- [Custom web apps](https://agency.alisamadii.com/services/custom-web-apps) — dashboards, auth, databases

## Pricing

- Website-as-a-Service (all-inclusive): ${fmtPrice(PRICING.setup)} setup + ${fmtPrice(PRICING.monthly)}/mo — design, development, CMS, SEO, and managed hosting. Typical price for most projects; varies by scope.
- One-time build (own it): priced per project — includes 5 months of hosting and contact email, you own the site outright. Contact for a quote.
- Custom: fully scoped projects (admin panels, auth, databases) — contact for a quote.

Terms and privacy pages are always included free.

## Locations

Headquartered in Jacksonville, FL; serving businesses across Florida remotely.

${locations}

## Writing

${writing}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
