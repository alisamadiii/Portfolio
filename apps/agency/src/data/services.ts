// ═══════════════════════════════════════════════════════════════
//  SERVICES — content source for /services and /services/<slug>
// ═══════════════════════════════════════════════════════════════
//
// Each entry drives one SEO landing page (src/pages/services/[slug].astro).
// Keyword goes in seoTitle, h1, and the first sentence of intro. FAQ content
// is visible on-page AND emitted as FAQPage JSON-LD from [slug].astro —
// Google retired FAQ rich results (May 2026), but AI answer engines
// (ChatGPT, Perplexity, AI Overviews) still parse FAQPage, so keep answers
// self-contained. Hero images are fetched by scripts/fetch-service-images.mjs
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
  /** Extra synonyms/misspellable terms surfaced only by site search. */
  searchKeywords?: string[];
  seoTitle: string;
  metaDescription: string;
  h1: string;
  heroSub: string;
  intro: string;
  /** Honest-signal flag: service offered while we build deep experience in it.
      Renders an "Experimenting" badge + banner on the service page and cards. */
  experimenting?: boolean;
  benefits: { title: string; text: string }[];
  process?: { title: string; text: string }[];
  processCta?: { label: string; href: string };
  /** Product screenshot walkthrough — alternating image + explanation rows. */
  showcase?: {
    heading: string;
    sub?: string;
    items: {
      title: string;
      text: string;
      image: { src: string; alt: string };
    }[];
  };
  /** Prominent amber notice banner (e.g. purchase requirements). */
  notice?: { label: string; title: string; text: string };
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
    searchKeywords: [
      "logo",
      "branding",
      "colors",
      "typography",
      "visual identity",
      "brand colors",
    ],
    seoTitle: "Brand Identity Design Built From Your Logo | Ali Samadi",
    metaDescription:
      "Brand identity design that starts with your logo — we turn its colors and character into your buttons, forms, and entire website theme.",
    h1: "Brand identity design that starts with your logo",
    heroSub:
      "Pick a logo you love, and we design everything else from it — the colors, typography, buttons, and forms of your website all carry its theme.",
    intro:
      "Ali Samadi Agency approaches brand identity design with one rule: the logo comes first. We generate a range of logo concepts, you choose the one that feels like your business, and that mark becomes the source of truth for everything we design. Its colors and character flow into your buttons, forms, headings, and every page of your website — so nothing looks bolted on, and everything looks like it came from the same brand. You're not approving abstract swatches; you're watching your logo become a website.",
    benefits: [
      {
        title: "Your logo leads",
        text: "The logo is the source of truth. We pull its colors and personality into a theme, and every part of your site inherits it — no guesswork, no mismatched styles.",
      },
      {
        title: "You choose, we build",
        text: "Instead of endless abstract revisions, you pick from a range of logo concepts. The one you choose is the one we design your entire site around.",
      },
      {
        title: "Everything matches",
        text: "Buttons, forms, headings, and pages all themed from the same mark — your site looks like one brand made it, because one logo drove all of it.",
      },
      {
        title: "Assets you own",
        text: "You get the full package: logo files in every format, color codes, font choices, and a simple usage guide. No lock-in, no per-use fees.",
      },
    ],
    process: [
      {
        title: "Logo concepts",
        text: "We generate a range of logo directions and you pick the one that feels like your business. That choice sets the theme for everything that follows.",
      },
      {
        title: "Realistic mockups",
        text: "We design website mockups straight from your logo — real buttons, forms, and pages carrying its colors and character, so you see the brand as it will actually look.",
      },
      {
        title: "Refinement",
        text: "We iterate on the mockups until it's right, then lock the system.",
      },
      {
        title: "Delivery",
        text: "Final files in every format plus a usage guide, with the theme applied live to your website.",
      },
    ],
    processCta: {
      label: "Read the full process on the blog",
      href: "/blog/web-design-process",
    },
    faqs: [
      {
        q: "What does brand identity design include?",
        a: "A logo you choose from a range of concepts (with variations for different sizes and backgrounds), a color palette pulled from it with exact codes, typography choices, and a short usage guide. If we're building your website, the whole theme is applied there directly.",
      },
      {
        q: "How long does a brand identity take?",
        a: "Most small-business identities take one to two weeks from kickoff to final files, depending on how many revision rounds you need.",
      },
      {
        q: "I already have a logo — can you build the rest?",
        a: "Perfect — that's exactly how we work. Send it over and we design everything from it: colors, typography, buttons, and forms all take their theme from your logo, so everything finally matches.",
      },
      {
        q: "Do I own the final files?",
        a: "Completely. Once paid, all logo files, font choices, and guidelines are yours, delivered in standard formats (SVG, PNG, PDF).",
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
      "Handwritten branding notes — identity, logo, design, strategy, marketing"
    ),
    cta: { label: "Start your brand", href: "/pricing" },
  },

  // ── Web Development ────────────────────────────────────────────
  {
    slug: "web-development",
    name: "Web Development",
    eyebrow: "Engineering",
    keyword: "web development agency",
    searchKeywords: [
      "website",
      "web design",
      "build a site",
      "nextjs",
      "react",
      "landing page",
      "developer",
    ],
    seoTitle: "Astro Web Development Agency — Fast Local Business Sites",
    metaDescription:
      "Web development agency building fast, static websites on Astro — instant page loads, SEO built in, and content you edit yourself. From $500.",
    h1: "A web development agency that builds fast Astro websites",
    heroSub:
      "Local-business websites built on Astro — pre-rendered static pages, instant navigation, and SEO baked in. Custom projects get Next.js, React, and Postgres.",
    intro:
      "Ali Samadi Agency is a web development agency that builds local-business websites on Astro — and there's a reason for that choice. Astro ships almost no JavaScript: every page is pre-rendered to plain HTML and served from a global CDN, so it loads instantly and Google indexes clean markup instead of waiting on scripts. Navigation between pages is smooth and app-like, and every build generates your sitemap, structured data, and an llms.txt file so AI search engines can read your site too. You edit content through a simple dashboard, and every save goes live automatically. And when a project needs more — accounts, dashboards, a database — we build custom on Next.js, React, and Postgres.",
    benefits: [
      {
        title: "Fast because it's static",
        text: "Astro pre-renders every page to plain HTML with near-zero JavaScript, served from a global CDN. Core Web Vitals are treated as a launch requirement, not an afterthought.",
      },
      {
        title: "SEO built in",
        text: "Clean semantic HTML, full meta and social tags, structured data that auto-upgrades to LocalBusiness for local companies, an auto-generated sitemap, and an llms.txt for AI engines — included, not an upsell.",
      },
      {
        title: "Edit it yourself",
        text: "Your content lives in a simple git-based CMS: change text and images from a dashboard, and every save deploys the site automatically. No developer needed for updates.",
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
        a: "Our all-inclusive plan starts at $349/mo — where most projects land — covering design, development, hosting, CMS, and updates. Or choose a one-time build you own outright, priced per project after we scope it. See the pricing page for details.",
      },
      {
        q: "Why Astro instead of WordPress or Wix?",
        a: "Speed, security, and ownership. Astro sites are pre-rendered static files with almost no JavaScript — no plugins to hack, no database to slow down, and Google gets clean HTML instantly. Page builders trade long-term performance for short-term convenience.",
      },
      {
        q: "Can I edit the site myself after launch?",
        a: "Yes — with the CMS add-on you edit text, images, and pages from a simple dashboard, and every save goes live automatically. See our Website Management service.",
      },
      {
        q: "How fast can you launch?",
        a: "Simple sites ship in one day once the project is confirmed and content is in hand. Larger builds are scoped with a timeline before we start.",
      },
      {
        q: "What if I need more than a website?",
        a: "When a project needs accounts, dashboards, payments, or a database, we build it custom on Next.js, React, and Postgres — the same stack used by Netflix and TikTok. See our Custom Web Apps service for how that works.",
      },
    ],
    externalLinks: [
      {
        label: "Astro — official documentation",
        url: "https://docs.astro.build",
      },
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
    searchKeywords: [
      "design",
      "interface",
      "figma",
      "user experience",
      "mockup",
      "redesign",
    ],
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
        a: "Yes — most small-business traffic is mobile, so every design is built responsive and tested on real phone screens before launch. Layout, text, and buttons all adapt so the site feels just as polished on a phone as on desktop.",
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
    searchKeywords: [
      "google ranking",
      "search engine",
      "analytics",
      "traffic",
      "rank higher",
      "google search",
      "seo",
    ],
    seoTitle: "Small Business SEO Services & Analytics Setup | Ali Samadi",
    metaDescription:
      "Small business SEO services built into every site: technical SEO, structured data, Core Web Vitals, AI-search readiness, and analytics you can read.",
    h1: "Small business SEO that's built in, not bolted on",
    heroSub:
      "Technical SEO, structured data, fast Core Web Vitals, and clean analytics — shipped with your site from day one.",
    intro:
      "Ali Samadi Agency provides small business SEO services as part of every website we build. Most SEO problems are built into a site at launch — slow pages, missing meta tags, no structured data — and cost more to fix later than to avoid. We ship the technical groundwork from day one: clean HTML, schema markup, sitemaps, fast Core Web Vitals, and content structured so both Google and AI search engines like ChatGPT can find and cite you. Then analytics show you what's actually working.",
    experimenting: true,
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
    eyebrow: "Client Hub & Care",
    keyword: "edit your own website",
    searchKeywords: [
      "hosting",
      "maintenance",
      "cms",
      "updates",
      "content editing",
      "manage website",
    ],
    seoTitle: "Edit Your Own Website — Client Hub Dashboard & Managed Care",
    metaDescription:
      "Edit your own website from one dashboard: change text, images, and pages, monitor your site's uptime, and see every email it sends — no developer needed.",
    h1: "Edit your own website — no developer needed",
    heroSub:
      "Client Hub gives you one dashboard to edit your content, monitor your site, and see every email it sends — while managed hosting keeps everything fast, secure, and backed up.",
    intro:
      "Ali Samadi Agency sets every client up to edit their own website through Client Hub, our client dashboard at hub.alisamadii.com. It's more than a CMS: from one place you change text, swap images, and add pages, watch your site's uptime and response time, and browse a log of every email your website sends — receipts, notifications, contact-form messages. Every content save goes live automatically in about a minute, with no developer round-trips and no hourly fees for a typo fix. Your images live in your own free ImageKit account, your code sits in a repository you're invited to, and more features — like email marketing — are on the way. Prefer hands-off? Managed hosting keeps the site fast, secure, and backed up while you run your business.",
    benefits: [
      {
        title: "Change anything, anytime",
        text: "Text, images, and pages editable from a clean, form-based dashboard. Every save commits and deploys automatically — live in about a minute.",
      },
      {
        title: "Your files stay yours",
        text: "Images and files live in your own ImageKit account — free for most use cases — connected right inside the dashboard. We never hold your media hostage; you keep full control even if we part ways.",
      },
      {
        title: "More than a CMS",
        text: "Client Hub also shows whether your site is live and how fast it responds, plus a searchable log of every email it sends. Email marketing is coming next.",
      },
      {
        title: "Impossible to break",
        text: "The editor only exposes content — never code or layout. Every change is version-controlled, so anything can be rolled back. You also get a GitHub collaborator invite, so the code is never locked away from you.",
      },
    ],
    process: [
      {
        title: "Purchase CMS access",
        text: "Subscribe with the email you want on the project. That exact email is the one we invite — it's your key to the dashboard.",
      },
      {
        title: "Get invited",
        text: "We send an invite to your purchase email. Sign in at hub.alisamadii.com and your website project is waiting for you.",
      },
      {
        title: "Edit your content",
        text: "Change text, swap images, add pages — all through simple forms. Connect your own ImageKit account for full control of your files.",
      },
      {
        title: "Save and it's live",
        text: "Every save is version-controlled and deploys automatically. Your change is on the live site in about a minute.",
      },
    ],
    showcase: {
      heading: "A tour of your dashboard",
      sub: "This is Client Hub — what you actually see when you sign in at hub.alisamadii.com.",
      items: [
        {
          title: "Home — your whole website at a glance",
          text: "One screen shows your site's live status, your content projects, your billing, and your latest change requests. No hunting through tools — everything about your website lives in one place.",
          image: {
            src: "/services/hub/hub-home.webp",
            alt: "Client Hub home dashboard showing website status, content, billing, and recent requests cards",
          },
        },
        {
          title: "Content editor — edit like filling in a form",
          text: "Your pages are organized into collections. Open an entry and every piece of content is a labeled field — headlines, paragraphs, images, dates. Rich text works like a familiar document editor. You can't touch code or layout, so you can't break the site.",
          image: {
            src: "/services/hub/hub-editor.webp",
            alt: "Client Hub content editor with form-based fields and rich text editing",
          },
        },
        {
          title: "Media — your images, your ImageKit account",
          text: "Connect your own free ImageKit account and manage every image and file from inside the dashboard. We never store your credentials, and the files belong to your account — not ours. You keep full control, always.",
          image: {
            src: "/services/hub/hub-media.webp",
            alt: "Client Hub media library with ImageKit integration for managing images",
          },
        },
        {
          title: "Website — know your site is up",
          text: "See at a glance whether your site is live, whether HTTPS is healthy, and how fast it responds — with the last check timestamped. If something's wrong, you see it the same moment we do.",
          image: {
            src: "/services/hub/hub-website.webp",
            alt: "Client Hub website monitoring page showing live status and response time",
          },
        },
        {
          title: "Emails — every message, logged",
          text: "Every email your website sends — receipts, notifications, contact-form messages — lands in a searchable log. Filter by type or date range and export the whole thing as a PDF for your records.",
          image: {
            src: "/services/hub/hub-emails.webp",
            alt: "Client Hub email log with search, filters, and PDF export",
          },
        },
      ],
    },
    notice: {
      label: "Before you subscribe",
      title: "One account. Your purchase email.",
      text: "CMS access must be purchased with the same account that gets invited to your project. We only invite the email address used at purchase — no additional emails. Without an active subscription you can still browse the dashboard, but saving content is locked: your edits stay in the editor until you subscribe, then save again.",
    },
    faqs: [
      {
        q: "Do I need technical skills to edit my site?",
        a: "No. Client Hub is a form-based dashboard — if you can fill in a form and upload a photo, you can edit your site. Changes go live automatically.",
      },
      {
        q: "What does website management cost?",
        a: "Everything — hosting, CMS, updates, and support — is included in the all-inclusive plan from $349/mo. One-time builds include 5 months of managed hosting, with optional renewal after. Current numbers are on the pricing page.",
      },
      {
        q: "What if I break something?",
        a: "You can't — the dashboard only exposes content, not code. And because every change is version-controlled, anything can be rolled back to a previous state.",
      },
      {
        q: "Can my team have accounts too?",
        a: "Access is one account per project: the email used to purchase CMS access is the only email we invite, and the only one that can save content. Keep that in mind when choosing which email to subscribe with.",
      },
      {
        q: "Who controls my images and files?",
        a: "You do. Media is managed through your own ImageKit account — free for the majority of use cases — connected inside the dashboard. Your files live in your account, not ours, so you're never tied to us.",
      },
      {
        q: "What happens if my subscription lapses?",
        a: "You can still sign in and browse, but saving is disabled until the subscription is active again. Nothing is deleted — your content and site keep running.",
      },
    ],
    externalLinks: [
      {
        label: "ImageKit — free media management for your files",
        url: "https://imagekit.io/plans/",
      },
      {
        label: "GitHub — repository collaborators explained",
        url: "https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-access-to-your-personal-repositories/inviting-collaborators-to-a-personal-repository",
      },
    ],
    related: ["web-development", "seo-analytics"],
    image: img(
      "website-management",
      "Business owner happily updating their own website from a laptop at a cafe"
    ),
    cta: { label: "See pricing", href: "/pricing" },
  },

  // ── Custom Web Apps ────────────────────────────────────────────
  {
    slug: "custom-web-apps",
    name: "Custom Web Apps",
    eyebrow: "Engineering",
    keyword: "custom web app development",
    searchKeywords: [
      "dashboard",
      "app",
      "database",
      "auth",
      "admin panel",
      "saas",
      "user accounts",
    ],
    seoTitle: "Custom Web App Development — Dashboards, Auth, Databases",
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
      {
        label: "Next.js — official documentation",
        url: "https://nextjs.org/docs",
      },
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
