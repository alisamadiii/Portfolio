// ─── Lead capture guards ─────────────────────────────────────────
// Pure checks for the public form endpoint (apps/api .../agency/forms/[formKey]).
// The endpoint is reachable by anyone who reads a client's page source, so
// nothing a visitor sends is trusted: sizes are capped, URLs are stripped to
// attribution params, and obvious bots are kept as spam.

/** Bigger bodies are rejected before parsing. */
export const MAX_BODY_BYTES = 64 * 1024;
/** Form inputs per submission; real forms have a handful. */
export const MAX_FIELDS = 40;
/** A human needs at least this long between page load and submit. */
export const MIN_FILL_MS = 2000;

/** Per visitor (form + IP). */
export const IP_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
/** Per form, across all visitors: past this, leads are saved as spam with no email. */
export const FORM_HOURLY_LIMIT = 30;

// Query params worth keeping on stored URLs. Everything else (?email=, ?token=,
// ?name=) can carry personal data, so it's dropped.
const KEPT_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
];

/** The URL with only attribution params and no hash; null if it is not an http(s) URL. */
export function stripUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const kept = new URLSearchParams();
  for (const [key, value] of parsed.searchParams) {
    if (KEPT_PARAMS.includes(key.toLowerCase())) kept.append(key, value);
  }
  const query = kept.toString();
  return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ""}`;
}

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

/** True for something that can safely go in a Reply-To header. */
export const isEmail = (value: string | null | undefined): value is string =>
  Boolean(value && value.length <= 254 && EMAIL_RE.test(value));

/**
 * Submitted faster than a person can fill a form. `undefined` (scripts cached
 * from before the timer existed) passes.
 */
export const tooFast = (elapsedMs: number | undefined) =>
  elapsedMs !== undefined && elapsedMs < MIN_FILL_MS;
