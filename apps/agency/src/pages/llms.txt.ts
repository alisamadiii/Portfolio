import type { APIRoute } from "astro";
import { PRICING, fmtPrice } from "../data/pricing";

// Plain-markdown summary for LLMs / answer engines. Prices come from
// src/data/pricing.ts so this never drifts from the site.
export const GET: APIRoute = () => {
  const body = `# Ali Samadi Agency

> Creative agency specializing in brand identity, web development, and digital
> strategy. Websites and web apps built from scratch on Next.js, React, and
> Postgres — custom, fast, and genuinely owned by the client, never templates.
> Based in Portland, OR, USA. Contact: agency@alisamadii.com.

## Pages

- [Home](https://agency.alisamadii.com/): services, process, work, and about.
- [Pricing](https://agency.alisamadii.com/pricing): plans and how pricing works.

## Services

- Web development (Next.js, React, Postgres)
- UI/UX design
- Brand identity
- SEO & analytics

## Pricing

- Monthly (all-inclusive): ${fmtPrice(PRICING.monthly)}/mo — design, development, CMS, email, SEO, and managed hosting.
- Upfront (one-time build): from ${fmtPrice(PRICING.upfront.basePrice)} for the first page, ${fmtPrice(PRICING.upfront.perExtraPage)} per additional page. Optional add-ons: hosting ${fmtPrice(PRICING.hosting)}/mo, CMS ${fmtPrice(PRICING.cms)}/mo.
- Custom: fully scoped projects (admin panels, auth, databases) — contact for a quote.

Terms and privacy pages are always included free.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
