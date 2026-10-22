// Builds a Google-style campaign tracking URL (what the Campaign URL Builder
// at ga-dev-tools generates): utm_* params appended to the landing page.

export type CampaignUrlInput = {
  url: string;
  source: string;
  medium: string;
  campaign?: string;
  /** The ads campaign id, becomes utm_id. */
  id?: string;
  term?: string;
  content?: string;
};

/** null until the url is valid and source + medium are filled in. */
export function buildCampaignUrl(input: CampaignUrlInput): string | null {
  const source = input.source.trim();
  const medium = input.medium.trim();
  if (!source || !medium) return null;

  let url: URL;
  try {
    url = new URL(input.url.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const params: [string, string | undefined][] = [
    ["utm_source", source],
    ["utm_medium", medium],
    ["utm_campaign", input.campaign?.trim() || undefined],
    ["utm_id", input.id?.trim() || undefined],
    ["utm_term", input.term?.trim() || undefined],
    ["utm_content", input.content?.trim() || undefined],
  ];
  for (const [key, value] of params) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

/** One-click fills for the channels Ali actually posts on. */
export const CAMPAIGN_URL_PRESETS = [
  { label: "Instagram", source: "instagram", medium: "social" },
  { label: "Facebook", source: "facebook", medium: "social" },
  { label: "Newsletter", source: "newsletter", medium: "email" },
  { label: "Google ads", source: "google", medium: "cpc" },
] as const;
