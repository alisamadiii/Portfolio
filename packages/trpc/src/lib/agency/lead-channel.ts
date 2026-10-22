import type {
  AgencyLeadChannel,
  AgencyLeadSource,
  AgencyLeadUtm,
} from "@workspace/drizzle/schema";

// ─── Lead channel ────────────────────────────────────────────────
// Where a lead came from. Computed once at capture and stored on the row;
// rows captured before channels existed are classified on read.
// Pure (no server-only) so the Hub can use the labels too.

export const CHANNEL_LABELS: Record<AgencyLeadChannel, string> = {
  google_ads: "Google Ads",
  paid_other: "Other paid ads",
  organic_search: "Organic search",
  social: "Social",
  email: "Email",
  referral: "Referral",
  direct: "Direct",
  manual: "Added by hand",
};

// Display order: paid first, then free, then manual.
export const CHANNEL_ORDER: AgencyLeadChannel[] = [
  "google_ads",
  "paid_other",
  "organic_search",
  "social",
  "email",
  "referral",
  "direct",
  "manual",
];

const PAID_MEDIUMS = ["cpc", "ppc", "paid", "paidsearch", "paid_search", "paidsocial", "paid_social", "display", "cpm"];
const SOCIAL_MEDIUMS = ["social", "social-network", "social_media", "sm"];
const EMAIL_SOURCES = ["usesend", "newsletter", "email", "resend", "mailchimp"];

const SEARCH_HOSTS = ["google.", "bing.", "yahoo.", "duckduckgo.", "ecosia.", "yandex.", "baidu.", "search.brave.", "startpage."];
const SOCIAL_HOSTS = [
  "facebook.",
  "fb.",
  "instagram.",
  "t.co",
  "twitter.",
  "x.com",
  "linkedin.",
  "lnkd.in",
  "youtube.",
  "youtu.be",
  "tiktok.",
  "pinterest.",
  "reddit.",
  "nextdoor.",
  "threads.",
  "yelp.",
];

const hostOf = (url?: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
};

// "maps.google.com" matches "google.", "t.co" only matches itself or a subdomain.
const hostMatches = (host: string, patterns: string[]) =>
  patterns.some((pattern) =>
    pattern.endsWith(".")
      ? host.startsWith(pattern) || host.includes(`.${pattern}`)
      : host === pattern || host.endsWith(`.${pattern}`)
  );

/** Hostname of a referrer, or null when it's missing or unparsable. */
export const referrerHost = hostOf;

export type ClassifyLeadInput = {
  source?: AgencyLeadSource | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  utm?: AgencyLeadUtm | null;
  referrer?: string | null;
  /** The client's own site; a referrer on it is internal navigation. */
  siteHost?: string | null;
};

export function classifyLead(lead: ClassifyLeadInput): AgencyLeadChannel {
  if (lead.source === "manual") return "manual";

  const medium = lead.utm?.medium?.trim().toLowerCase() ?? "";
  const source = lead.utm?.source?.trim().toLowerCase() ?? "";
  const paidMedium = PAID_MEDIUMS.includes(medium);

  if (lead.gclid || lead.gbraid || lead.wbraid) return "google_ads";
  if (paidMedium && (source === "google" || source === "adwords")) return "google_ads";
  if (paidMedium) return "paid_other";
  if (medium === "email" || EMAIL_SOURCES.includes(source)) return "email";
  if (SOCIAL_MEDIUMS.includes(medium)) return "social";

  const host = hostOf(lead.referrer);
  const site = lead.siteHost?.toLowerCase().replace(/^www\./, "") ?? null;
  const external = host && (!site || (host !== site && !host.endsWith(`.${site}`)));

  if (medium === "organic" || (external && hostMatches(host, SEARCH_HOSTS))) {
    return "organic_search";
  }
  if (external && hostMatches(host, SOCIAL_HOSTS)) return "social";
  if (external) return "referral";
  // Tagged with a utm source we don't recognise (e.g. a QR code or a flyer).
  if (source) return "referral";
  return "direct";
}
