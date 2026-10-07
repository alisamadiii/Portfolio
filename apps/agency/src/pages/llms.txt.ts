import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { cities } from "../data/cities";
import { getDocsTree } from "../data/docs";
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
        `- [${p.data.title}](https://www.alisamadii.com/blog/${p.id}) — ${p.data.description}`
    )
    .join("\n");
  const locations = cities
    .map(
      (c) =>
        `- [Web design in ${c.name}, FL](https://www.alisamadii.com/locations/${c.slug})`
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

> Creative agency specializing in brand identity, web development, and digital
> strategy. Websites and web apps built from scratch on Next.js, React, and
> Postgres — custom, fast, and genuinely owned by the client, never templates.
> Based in Jacksonville, FL, USA. Contact: agency@alisamadii.com.

## Pages

- [Home](https://www.alisamadii.com/): services, process, work, and about.
- [About](https://www.alisamadii.com/about): who we are, how we work, the founder.
- [Work](https://www.alisamadii.com/work): live client sites and concept projects.
- [Services](https://www.alisamadii.com/services): everything we offer.
- [Pricing](https://www.alisamadii.com/pricing): plans and how pricing works.
- [Contact](https://www.alisamadii.com/contact): email, booking, phone.
- [Blog](https://www.alisamadii.com/blog): articles on how websites get built.
- [Docs](https://www.alisamadii.com/docs): plain-language guides — the Client Hub dashboard, the build/handoff process, and client ownership.
- [Business Newsletter](https://www.alisamadii.com/newsletter): a managed email newsletter for local businesses — own domain, branded templates, writing and sending handled. Quoted per business, no published price.
- [Pest Control Websites](https://www.alisamadii.com/pest-control): custom websites for pest control companies — click-to-call, per-pest and per-city pages that rank, review walls, booking forms. ${fmtPrice(PRICING.setup)} + ${fmtPrice(PRICING.monthly)}/mo.

## Services

- [Web development](https://www.alisamadii.com/services/web-development) — custom sites on Next.js, React, Postgres
- [UI/UX design](https://www.alisamadii.com/services/ui-ux-design) — interfaces designed to convert
- [Brand identity](https://www.alisamadii.com/services/brand-identity) — logo, color, typography systems
- [SEO & analytics](https://www.alisamadii.com/services/seo-analytics) — technical SEO + AI-search readiness
- [Website management](https://www.alisamadii.com/services/website-management) — CMS access + managed hosting
- [Custom web apps](https://www.alisamadii.com/services/custom-web-apps) — dashboards, auth, databases

## Pricing

- Website-as-a-Service (all-inclusive): ${fmtPrice(PRICING.setup)} + ${fmtPrice(PRICING.monthly)}/mo — design, development, CMS, email, SEO, and managed hosting. For local and small businesses; typical price for most projects, varies by scope.
- Custom: fully scoped projects (admin panels, auth, databases) — contact for a quote.

Terms and privacy pages are always included free.

## Locations

Headquartered in Jacksonville, FL; serving businesses across Florida remotely.

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
