// ═══════════════════════════════════════════════════════════════
//  SERVICES — content source for /services and /services/<slug>
// ═══════════════════════════════════════════════════════════════
//
// Each entry drives one SEO landing page (src/pages/services/[slug].astro).
// Keyword goes in seoTitle, h1, and the first sentence of intro. FAQ content
// is visible on-page only — no FAQPage schema (Google retired FAQ rich
// results May 2026). Hero images are fetched by scripts/fetch-service-images.mjs
// (Pexels, self-hosted, credited).

import credits from "./service-image-credits.json";

export interface ServiceLink {
  label: string;
  url: string;
}

export interface Service {
  slug: string;
  name: string;
  eyebrow: string;
  keyword: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  heroSub: string;
  intro: string;
  benefits: { title: string; text: string }[];
  process?: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
  externalLinks: ServiceLink[];
  related: string[];
  image: {
    src: string;
    alt: string;
    credit: { name: string; url: string; pexelsUrl: string };
  };
  cta: { label: string; href: string };
}

const img = (slug: string, alt: string) => ({
  src: `/services/${slug}.webp`,
  alt,
  credit: credits[slug as keyof typeof credits],
});

export const services: Service[] = [
  // ── Brand Identity ─────────────────────────────────────────────
  {
    slug: "brand-identity",
    name: "Brand Identity",
    eyebrow: "Design",
    keyword: "brand identity design",
    seoTitle: "Brand Identity Design for Small Businesses — Ali Samadi Agency",
    metaDescription:
      "Brand identity design that makes your business recognizable — logo, color, typography, and a consistent visual system, built alongside your website.",
    h1: "Brand identity design that makes you recognizable",
    heroSub:
      "Logo, color, typography, and a visual system that carries through your website, socials, and everything you print.",
    intro:
      "Ali Samadi Agency designs brand identities for startups and small businesses — the logo, color palette, typography, and visual rules that make your company look consistent and credible everywhere it appears. A strong brand identity isn't decoration: it's the difference between a business people remember and one they scroll past. We design identity and website together, so what you approve in the style guide is exactly what ships on your site.",
    benefits: [
      {
        title: "One system, everywhere",
        text: "Colors, type, and spacing defined once and applied consistently across your site, social profiles, and documents — no more mismatched materials.",
      },
      {
        title: "Built with your website",
        text: "Because we build the site too, your identity is designed for the web first — real buttons, real headings, real pages, not just a logo file.",
      },
      {
        title: "Assets you own",
        text: "You get the full package: logo files in every format, color codes, font choices, and a simple usage guide. No lock-in, no per-use fees.",
      },
      {
        title: "Distinct on purpose",
        text: "We study your competitors before we design, so your identity separates you from them instead of blending in.",
      },
    ],
    process: [
      {
        title: "Discovery",
        text: "We learn your business, audience, and competitors — what should this brand say, and to whom?",
      },
      {
        title: "Concepts",
        text: "You get distinct identity directions — logo, palette, and type in realistic mockups, not abstract swatches.",
      },
      {
        title: "Refinement",
        text: "We iterate on your chosen direction until it's right, then lock the system.",
      },
      {
        title: "Delivery",
        text: "Final files in every format plus a usage guide, applied live to your website.",
      },
    ],
    faqs: [
      {
        q: "What does brand identity design include?",
        a: "Logo design (with variations for different sizes and backgrounds), a color palette with exact codes, typography choices, and a short usage guide. If we're building your website, the identity is applied there directly.",
      },
      {
        q: "How long does a brand identity take?",
        a: "Most small-business identities take one to two weeks from kickoff to final files, depending on how many revision rounds you need.",
      },
      {
        q: "I already have a logo — can you build the rest?",
        a: "Yes. We can keep your existing logo and design the surrounding system — colors, typography, and web application — so everything finally matches.",
      },
      {
        q: "Do I own the final files?",
        a: "Completely. Once paid, all logo files, fonts choices, and guidelines are yours, delivered in standard formats (SVG, PNG, PDF).",
      },
    ],
    externalLinks: [
      {
        label: "Material Design — color system fundamentals",
        url: "https://m3.material.io/styles/color/system/overview",
      },
      {
        label: "Nielsen Norman Group — brand experience research",
        url: "https://www.nngroup.com/articles/brand-experience-ux/",
      },
    ],
    related: ["web-development", "ui-ux-design"],
    image: img(
      "brand-identity",
      "Brand designer arranging a color palette and moodboard"
    ),
    cta: { label: "Start your brand", href: "/pricing" },
  },

  // ── Web Development ────────────────────────────────────────────
  {
    slug: "web-development",
    name: "Web Development",
    eyebrow: "Engineering",
    keyword: "web development agency",
    seoTitle:
      "Next.js Web Development Agency — Custom Websites | Ali Samadi Agency",
    metaDescription:
      "Web development agency building fast, custom websites on Next.js, React, and Postgres. Production-grade code, 1-day delivery for simple sites, from $500.",
    h1: "A web development agency that ships production-grade code",
    heroSub:
      "Custom websites built on Next.js, React, and Postgres — fast, SEO-ready, and genuinely yours. Never a page-builder template.",
    intro:
      "Ali Samadi Agency is a web development agency that builds every site from scratch on a modern stack: Next.js, React, and Postgres. That means real, production-grade code — fast to load, easy for Google to index, and free of the bloat that page builders bundle in. Simple sites launch in as little as one day once the project is confirmed, starting at $500 for the first page. You own the code, the content, and the domain.",
    benefits: [
      {
        title: "Modern stack, not templates",
        text: "Next.js and React are the same technologies used by Netflix, TikTok, and Nike — production-grade engineering scaled down to small-business budgets.",
      },
      {
        title: "Fast by default",
        text: "Static-first pages served from a global CDN. Core Web Vitals are treated as a launch requirement, not an afterthought.",
      },
      {
        title: "SEO built in",
        text: "Clean semantic HTML, structured data, sitemaps, and meta tags ship with every build — the technical SEO groundwork is included, not an upsell.",
      },
      {
        title: "You own everything",
        text: "Code in your repository, content in your CMS, domain in your name. Leave anytime and take it all with you.",
      },
    ],
    process: [
      {
        title: "Scope",
        text: "We confirm pages, features, and price before any work begins — no surprise invoices.",
      },
      {
        title: "Design & build",
        text: "Design and development happen together; you review real pages, not static mockups.",
      },
      {
        title: "Launch",
        text: "Deployed to production with SEO, analytics, and forms wired up. Simple sites: one day from confirmation.",
      },
      {
        title: "Maintain",
        text: "Optional managed hosting and CMS so your site stays fast, secure, and editable.",
      },
    ],
    faqs: [
      {
        q: "How much does a website cost?",
        a: "Our upfront build starts at $500 for the first page and $200 per additional page, with optional hosting at $20/mo and CMS access at $30/mo. There's also an all-inclusive monthly plan — see the pricing page for current numbers.",
      },
      {
        q: "Why Next.js instead of WordPress or Wix?",
        a: "Speed, security, and ownership. Next.js sites are pre-rendered static files — no plugins to hack, no database to slow down, and Google gets clean HTML instantly. Page builders trade long-term performance for short-term convenience.",
      },
      {
        q: "Can I edit the site myself after launch?",
        a: "Yes — with the CMS add-on you edit text, images, and pages from a simple dashboard, and every change goes live automatically. See our Website Management service.",
      },
      {
        q: "How fast can you launch?",
        a: "Simple sites ship in one day once the project is confirmed and content is in hand. Larger builds are scoped with a timeline before we start.",
      },
    ],
    externalLinks: [
      { label: "Next.js — official documentation", url: "https://nextjs.org/docs" },
      {
        label: "web.dev — why page speed matters",
        url: "https://web.dev/learn/performance",
      },
    ],
    related: ["seo-analytics", "website-management", "custom-web-apps"],
    image: img(
      "web-development",
      "Developer writing code on a laptop with charts on screen"
    ),
    cta: { label: "See pricing", href: "/pricing" },
  },

  // ── UI/UX Design ───────────────────────────────────────────────
  {
    slug: "ui-ux-design",
    name: "UI/UX Design",
    eyebrow: "Design",
    keyword: "ui/ux design services",
    seoTitle: "UI/UX Design Services That Convert — Ali Samadi Agency",
    metaDescription:
      "UI/UX design services for websites and web apps — clear layouts, accessible interfaces, and user journeys designed to turn visitors into customers.",
    h1: "UI/UX design services that turn visitors into customers",
    heroSub:
      "Clear layouts, obvious next steps, and interfaces that feel effortless — designed around your users, not design trends.",
    intro:
      "Ali Samadi Agency provides UI/UX design services for websites and web applications. Good UX is mostly invisible: visitors find what they need, understand what you offer, and know exactly what to do next. We design interfaces around those journeys — grounded in usability research, accessibility standards, and conversion patterns — then build them ourselves, so nothing gets lost between the mockup and the live site.",
    benefits: [
      {
        title: "Designed for the next click",
        text: "Every page has one job. We design layouts around the action you want visitors to take, and remove everything that competes with it.",
      },
      {
        title: "Accessible by standard",
        text: "Readable contrast, keyboard navigation, touch-friendly targets, and reduced-motion support — accessibility guidelines applied as defaults, not add-ons.",
      },
      {
        title: "Designer and developer are the same team",
        text: "No handoff gap. The person designing the interface builds it, so the shipped site matches the approved design exactly.",
      },
      {
        title: "Grounded in evidence",
        text: "Layout and interaction decisions follow published usability research, not aesthetic guesswork.",
      },
    ],
    faqs: [
      {
        q: "What's the difference between UI and UX design?",
        a: "UX (user experience) is the structure — what pages exist, how journeys flow, where information lives. UI (user interface) is the surface — layout, color, type, and interactive detail. We do both as one process, because they only work together.",
      },
      {
        q: "Do you redesign existing websites?",
        a: "Yes. We audit what's underperforming, keep what works, and redesign the rest — usually without breaking your existing content or SEO.",
      },
      {
        q: "Will the design work on phones?",
        a: "Mobile isn't an afterthought — most small-business traffic is mobile, so we design the phone experience first and scale up to desktop.",
      },
    ],
    externalLinks: [
      {
        label: "Nielsen Norman Group — usability heuristics",
        url: "https://www.nngroup.com/articles/ten-usability-heuristics/",
      },
      {
        label: "W3C — Web Accessibility Initiative",
        url: "https://www.w3.org/WAI/fundamentals/accessibility-intro/",
      },
    ],
    related: ["brand-identity", "web-development"],
    image: img(
      "ui-ux-design",
      "UX designer sketching interface wireframes on paper"
    ),
    cta: { label: "Start a project", href: "/#contact" },
  },

  // ── SEO & Analytics ────────────────────────────────────────────
  {
    slug: "seo-analytics",
    name: "SEO & Analytics",
    eyebrow: "Growth",
    keyword: "small business seo services",
    seoTitle:
      "Small Business SEO Services & Analytics Setup — Ali Samadi Agency",
    metaDescription:
      "Small business SEO services built into every site: technical SEO, structured data, Core Web Vitals, AI-search readiness, and analytics you can actually read.",
    h1: "Small business SEO that's built in, not bolted on",
    heroSub:
      "Technical SEO, structured data, fast Core Web Vitals, and clean analytics — shipped with your site from day one.",
    intro:
      "Ali Samadi Agency provides small business SEO services as part of every website we build. Most SEO problems are built into a site at launch — slow pages, missing meta tags, no structured data — and cost more to fix later than to avoid. We ship the technical groundwork from day one: clean HTML, schema markup, sitemaps, fast Core Web Vitals, and content structured so both Google and AI search engines like ChatGPT can find and cite you. Then analytics show you what's actually working.",
    benefits: [
      {
        title: "Technical SEO from day one",
        text: "Sitemaps, robots rules, canonical tags, meta descriptions, and structured data ship with the build — the foundation Google expects, done once and done right.",
      },
      {
        title: "Ready for AI search",
        text: "Content structured so AI engines — Google AI Overviews, ChatGPT, Perplexity — can read and cite your business, not just classic search.",
      },
      {
        title: "Speed as a ranking signal",
        text: "Core Web Vitals are part of how Google ranks pages. Our static-first builds pass them by design.",
      },
      {
        title: "Analytics without the noise",
        text: "Privacy-respecting analytics that answer the questions that matter: where visitors come from, what they do, and what converts.",
      },
    ],
    faqs: [
      {
        q: "How long does SEO take to work?",
        a: "Technical SEO takes effect as soon as Google recrawls your site — typically days to weeks. Ranking for competitive keywords takes months and depends on content and competition. We set up the foundation so every future effort compounds.",
      },
      {
        q: "Do you guarantee first-page rankings?",
        a: "No one honestly can — rankings depend on competition, content, and Google's algorithms. What we guarantee is a technically clean site that meets every published requirement, which is the prerequisite for ranking at all.",
      },
      {
        q: "What's included in the analytics setup?",
        a: "Traffic sources, page performance, and conversion events (form submissions, checkout clicks) in a dashboard you can read without training. Google Search Console is connected so you see the queries that bring people in.",
      },
      {
        q: "What is AI search optimization?",
        a: "AI engines like ChatGPT and Perplexity read raw page content and cite businesses directly in answers. We structure your content — clear entity naming, self-contained descriptions, structured data — so those systems can understand and recommend you.",
      },
    ],
    externalLinks: [
      {
        label: "Google Search Central — SEO fundamentals",
        url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
      },
      {
        label: "web.dev — Core Web Vitals",
        url: "https://web.dev/articles/vitals",
      },
    ],
    related: ["web-development", "website-management"],
    image: img(
      "seo-analytics",
      "Analytics dashboard showing traffic charts on a screen"
    ),
    cta: { label: "See pricing", href: "/pricing" },
  },

  // ── Website Management ─────────────────────────────────────────
  {
    slug: "website-management",
    name: "Website Management",
    eyebrow: "CMS & Care",
    keyword: "edit your own website",
    seoTitle:
      "Edit Your Own Website — CMS Access & Managed Care | Ali Samadi Agency",
    metaDescription:
      "Edit your own website without a developer: CMS access for text, images, and pages, plus managed hosting that keeps your site fast, secure, and backed up.",
    h1: "Edit your own website — no developer needed",
    heroSub:
      "CMS access for your text, images, and pages, plus managed hosting that keeps everything fast, secure, and backed up.",
    intro:
      "Ali Samadi Agency sets every client up to edit their own website. Through a simple CMS dashboard you change text, swap images, and add pages yourself — every save goes live automatically, no developer round-trips, no hourly fees for a typo fix. Prefer hands-off? Our managed hosting keeps the site fast, secure, and backed up while you run your business. You also get a GitHub collaborator invite, so the code is never locked away from you.",
    benefits: [
      {
        title: "Change anything, anytime",
        text: "Text, images, and pages editable from a clean dashboard. Every save commits and deploys automatically — live in about a minute.",
      },
      {
        title: "No hostage code",
        text: "You're invited as a collaborator on the repository. Your site's code is visible, portable, and yours — switch developers anytime.",
      },
      {
        title: "Managed and monitored",
        text: "Hosting, SSL, backups, and updates handled for a flat monthly fee. If something breaks, fixing it is our job, not yours.",
      },
      {
        title: "Impossible to break",
        text: "Editors can change content, not code or layout. You can't accidentally take the site down from the CMS.",
      },
    ],
    faqs: [
      {
        q: "Do I need technical skills to edit my site?",
        a: "No. The CMS is a form-based dashboard — if you can fill in a form and upload a photo, you can edit your site. Changes go live automatically.",
      },
      {
        q: "What does website management cost?",
        a: "Managed hosting is $20/mo and CMS access is $30/mo as add-ons to an upfront build — or everything is included in the all-inclusive monthly plan. Current numbers are on the pricing page.",
      },
      {
        q: "What if I break something?",
        a: "You can't — the CMS only exposes content, not code. And because every change is version-controlled, anything can be rolled back to a previous state.",
      },
      {
        q: "Can my team have accounts too?",
        a: "Yes. Collaborators can be invited by email with content-only access — no GitHub account required for editors.",
      },
    ],
    externalLinks: [
      {
        label: "Pages CMS — how git-based editing works",
        url: "https://pagescms.org/docs/",
      },
      {
        label: "GitHub — repository collaborators explained",
        url: "https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-access-to-your-personal-repositories/inviting-collaborators-to-a-personal-repository",
      },
    ],
    related: ["web-development", "seo-analytics"],
    image: img(
      "website-management",
      "Person updating their website content on a laptop"
    ),
    cta: { label: "See pricing", href: "/pricing" },
  },

  // ── Custom Web Apps ────────────────────────────────────────────
  {
    slug: "custom-web-apps",
    name: "Custom Web Apps",
    eyebrow: "Engineering",
    keyword: "custom web app development",
    seoTitle:
      "Custom Web App Development — Dashboards, Auth, Databases | Ali Samadi Agency",
    metaDescription:
      "Custom web app development on Next.js and Postgres: admin dashboards, user accounts, databases, and internal tools — scoped and quoted per project.",
    h1: "Custom web app development, scoped to what you need",
    heroSub:
      "Admin dashboards, user accounts, databases, payments — real software built on Next.js and Postgres, quoted per project.",
    intro:
      "Ali Samadi Agency builds custom web applications for businesses that have outgrown a simple website: admin dashboards, customer portals with user accounts, booking and payment flows, and internal tools backed by a real database. Every app is built on the same production stack as our websites — Next.js, React, and Postgres — so it's fast, secure, and maintainable by any competent developer, not just us. We scope the project together first and quote it fairly before any work begins.",
    benefits: [
      {
        title: "Real software, small-team speed",
        text: "Authentication, databases, dashboards, and payments — the same engineering patterns large products use, delivered without agency overhead.",
      },
      {
        title: "Scoped before it's priced",
        text: "We define what the app does, what it won't do, and what it costs — in writing — before development starts. No open-ended billing.",
      },
      {
        title: "Built to hand over",
        text: "Standard stack, clean code, your repository. If you grow into an in-house team someday, they inherit a codebase they'll recognize.",
      },
      {
        title: "Starts as small as you need",
        text: "A v1 with the core feature beats a year-long spec. We ship the essential version first, then grow it against real usage.",
      },
    ],
    process: [
      {
        title: "Scoping call",
        text: "We map what the app must do, who uses it, and what data it manages.",
      },
      {
        title: "Written proposal",
        text: "Fixed scope, timeline, and price. You know the total before we start.",
      },
      {
        title: "Build in stages",
        text: "You see working software early and often — not a big reveal at the end.",
      },
      {
        title: "Launch & support",
        text: "Deployed to production with monitoring; support and iteration scoped as you grow.",
      },
    ],
    faqs: [
      {
        q: "How much does a custom web app cost?",
        a: "It depends entirely on scope — a simple portal with accounts is a different project from a booking system with payments. That's why we scope first and quote a fixed price in writing before any work begins.",
      },
      {
        q: "What can a custom web app include?",
        a: "User accounts and authentication, admin dashboards, databases, file uploads, payments and subscriptions via Stripe, email notifications, and integrations with tools you already use.",
      },
      {
        q: "What stack do you build on?",
        a: "Next.js and React for the application, Postgres for data, and Stripe for payments — a standard, battle-tested stack that any professional developer can maintain after us.",
      },
      {
        q: "Can you extend an app you didn't build?",
        a: "Sometimes — it depends on the state of the existing code. We review it first and tell you honestly whether extending or rebuilding is the better investment.",
      },
    ],
    externalLinks: [
      { label: "Next.js — official documentation", url: "https://nextjs.org/docs" },
      {
        label: "PostgreSQL — about the database",
        url: "https://www.postgresql.org/about/",
      },
    ],
    related: ["web-development", "ui-ux-design"],
    image: img(
      "custom-web-apps",
      "Engineering team planning a web application at a whiteboard"
    ),
    cta: { label: "Scope your app", href: "/#contact" },
  },
];

export const getService = (slug: string) =>
  services.find((s) => s.slug === slug);
