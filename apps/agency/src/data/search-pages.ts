// ═══════════════════════════════════════════════════════════════
//  SEARCH PAGES — static-page entries for the site search index
// ═══════════════════════════════════════════════════════════════
//
// Blog posts, services, and projects are indexed automatically from their
// data sources (see src/pages/search-index.json.ts). This registry only
// covers hand-written static pages — add an entry when a new page ships.
// Keywords are synonyms a visitor might type ("cost" for pricing, etc.).

export interface SearchPage {
  title: string;
  description: string;
  url: string;
  keywords: string[];
}

export const SEARCH_PAGES: SearchPage[] = [
  {
    title: "Home",
    description:
      "Services, process, work, pricing, and how to start a project.",
    url: "/",
    keywords: ["homepage", "start", "agency", "ali samadi"],
  },
  {
    title: "Pricing",
    description:
      "Monthly plan, one-time upfront build, or fully custom — compare plans.",
    url: "/pricing",
    keywords: [
      "cost",
      "price",
      "plans",
      "how much",
      "monthly",
      "upfront",
      "quote",
      "rates",
      "budget",
      "payment",
    ],
  },
  {
    title: "About",
    description: "Who we are, how we work, and the founder behind the studio.",
    url: "/about",
    keywords: [
      "team",
      "founder",
      "who we are",
      "story",
      "studio",
      "ali samadi",
    ],
  },
  {
    title: "Contact",
    description:
      "Email, book a call, or send a message — let's talk about your project.",
    url: "/contact",
    keywords: [
      "email",
      "phone",
      "book a call",
      "reach out",
      "hire",
      "get in touch",
      "talk",
      "meeting",
    ],
  },
  {
    title: "Work",
    description:
      "Live client sites and concept projects we've designed and built.",
    url: "/work",
    keywords: [
      "projects",
      "portfolio",
      "case studies",
      "clients",
      "examples",
      "sites we built",
      "showcase",
    ],
  },
  {
    title: "Services",
    description:
      "Everything we offer — design, development, SEO, management, and more.",
    url: "/services",
    keywords: ["what we do", "offerings", "capabilities", "help"],
  },
  {
    title: "Blog",
    description:
      "Articles and guides on how websites get designed, built, and run.",
    url: "/blog",
    keywords: ["articles", "writing", "posts", "guides", "tips"],
  },
  {
    title: "Terms of Service",
    description: "The terms that govern working with the agency.",
    url: "/terms",
    keywords: ["legal", "terms", "conditions"],
  },
  {
    title: "Privacy Policy",
    description: "How we handle your data and privacy.",
    url: "/privacy",
    keywords: ["legal", "privacy", "data"],
  },
];
