// Per-client site config — edit this ONE file when forking the template.
// Everything SEO-related (metadata, sitemap, robots, manifest, llms.txt,
// JSON-LD) reads from here. After editing, regenerate brand assets:
//   node scripts/generate-brand-assets.mjs
export const siteConfig = {
  /** Canonical URL — the domain that serves 200, no trailing slash. */
  url: "https://template.alisamadii.com",
  /** Site name — shown by Google as the SERP site name. */
  name: "AliSamadii Agency",
  /** Short variant (PWA short_name, alternateName). */
  shortName: "AliSamadii",
  description:
    "Custom websites, admin panels, hosting, and digital solutions to grow your business.",
  /** Business info for JSON-LD — fill in per client. */
  business: {
    /** schema.org type: "Organization" | "LocalBusiness" | etc. */
    type: "Organization",
    email: "agency@alisamadii.com",
    /** E.164 format — verify digit count. */
    telephone: "",
    address: {
      locality: "",
      region: "",
      country: "US",
    },
    /** Social profile URLs. */
    sameAs: [] as string[],
  },
  themeColor: "#6C5CE7",
  backgroundColor: "#0a0a0a",
} as const;
