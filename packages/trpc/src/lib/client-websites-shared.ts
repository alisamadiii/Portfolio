// ─── Client websites (shared, browser-safe) ──────────────────────
// Designs in the `client-websites` R2 bucket, one folder per client:
// <slug>/_meta.json, index.html + pages + assets, and optional
// presentation.html / preview.mp4 / preview.jpg. Full contract:
// context/client-websites.md. Server side: lib/client-websites.ts.

export const CLIENT_WEBSITES_BUCKET = "client-websites";

export const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const META_FILE = "_meta.json";
export const PRESENTATION_FILE = "presentation.html";
export const PREVIEW_VIDEO_FILE = "preview.mp4";
export const PREVIEW_POSTER_FILE = "preview.jpg";
export const INDEX_FILE = "index.html";

/** Agency-only files: never part of the website itself (skipped on Import). */
export const NON_SITE_FILES = [
  META_FILE,
  PRESENTATION_FILE,
  PREVIEW_VIDEO_FILE,
  PREVIEW_POSTER_FILE,
] as const;

/** Where the api serves a site's files (admin session only). */
export const SITES_PATH = "/client-websites";

// Keys are flat strings in R2 but become URL paths, where "." and ".."
// segments would be resolved by the URL parser and escape the prefix (or the
// bucket). Every key passes through this before it reaches a request.
export const isSafeKey = (key: string) =>
  key.length > 0 &&
  key
    .split("/")
    .every((seg) => seg !== "" && seg !== "." && seg !== ".." && !seg.includes("\\"));

/**
 * The object key a site path asks for first, the way a static host resolves
 * it: "" -> index.html, "about/" -> about/index.html, "about" -> about (the
 * caller then tries about.html and about/index.html).
 */
export const siteKey = (slug: string, rest: string) =>
  `${slug}/${rest === "" || rest.endsWith("/") ? `${rest}${INDEX_FILE}` : rest}`;

/**
 * Import: the site's own files, keyed by their path inside the site. Drops
 * the agency-only files at the folder root and anything unsafe.
 */
export const importPath = (slug: string, key: string): string | null => {
  const prefix = `${slug}/`;
  if (!key.startsWith(prefix)) return null;
  const path = key.slice(prefix.length);
  if (!path || !isSafeKey(path)) return null;
  if ((NON_SITE_FILES as readonly string[]).includes(path)) return null;
  return path;
};

// Industry filter tabs, in display order. Kept in step with INDUSTRIES in
// apps/agency/src/lib/showcase.ts so both listings group projects the same
// way. A project's industry is the first whose pattern matches its
// business.category ("Used car dealer & auto repair" -> automotive), or
// showcase.industry in _meta.json when set to one of these ids. Anything
// unmatched lands in "other".
export const INDUSTRIES = [
  { id: "restaurants", label: "Restaurants", match: /restaurant|cafe|coffee|bakery|grill|pizza|bar\b|diner|food|catering/i },
  { id: "automotive", label: "Automotive", match: /auto|car\b|car |dealer|tire|mechanic|body shop|towing|detailing/i },
  { id: "beauty", label: "Beauty & barber", match: /barber|salon|beauty|nail|spa\b|lash|brow|tattoo/i },
  { id: "home-services", label: "Home services", match: /plumb|hvac|roof|electric|handyman|landscap|lawn|pest|clean|paint|contractor|pool/i },
  { id: "health", label: "Health", match: /dent|clinic|doctor|chiropract|therap|medical|pharmacy|fitness|gym|yoga/i },
  { id: "other", label: "Other", match: null },
] as const;

export type Industry = (typeof INDUSTRIES)[number]["id"];

export const industryOf = (
  override: string | undefined,
  category: string | undefined
): Industry =>
  INDUSTRIES.find((i) => i.id === override)?.id ??
  INDUSTRIES.find((i) => i.match && category && i.match.test(category))?.id ??
  "other";

// index.html pages are addressed by their folder so relative links resolve
export const sitePagePath = (slug: string, page: string) =>
  `${SITES_PATH}/${slug}/${page.replace(/(^|\/)index\.html$/, "$1")}`;

// _meta.json is uploaded content: only http(s) values become links.
export const httpUrl = (value?: string) =>
  value && /^https?:\/\//i.test(value) ? value : null;

export const formatMoney = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

// ─── Types ───────────────────────────────────────────────────────

export type ClientWebsiteMeta = {
  version?: number;
  name: string;
  uploadedAt?: string;
  design?: { chatUrl?: string; title?: string; notes?: string };
  business?: {
    placeId?: string;
    name?: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    reviewCount?: number;
    mapsUrl?: string;
    category?: string;
    hours?: string[];
    lat?: number;
    lng?: number;
  };
  showcase?: {
    title?: string;
    summary?: string;
    features?: string[];
    industry?: string;
    hidden?: boolean;
  };
};

export type ClientWebsite = {
  slug: string;
  meta: ClientWebsiteMeta | null;
  // "invalid" = _meta.json exists but is not valid JSON / fails the schema
  metaStatus: "ok" | "missing" | "invalid";
  updatedAt: string | null;
};

export type ClientWebsiteDetail = ClientWebsite & {
  pages: string[];
  hasPresentation: boolean;
  hasPreviewVideo: boolean;
};

export type CatalogPrice = {
  id: string;
  productId: string;
  productName: string;
  nickname: string | null;
  unitAmount: number;
  currency: string;
  // null = one-time
  interval: string | null;
  intervalCount: number;
};

export type PaymentLink = {
  id: string;
  // processing = checkout finished, money not in yet (bank payments take days)
  status: "open" | "processing" | "paid" | "expired";
  email: string | null;
  amountTotal: number | null;
  currency: string | null;
  recurring: boolean;
  createdAt: string;
  expiresAt: string;
  // only while the link is open
  url: string | null;
  note: string | null;
};
