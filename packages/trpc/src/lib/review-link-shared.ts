// Feedback app: client-safe helpers shared by the hub, the tRPC router and
// the public /api/review endpoint.

export const REVIEW_PAGE_BASE = "https://www.alisamadii.com/review";

/** The Google "write a review" page for a place. */
export const googleReviewUrl = (placeId: string) =>
  `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

export const reviewPageUrl = (linkId: string) => `${REVIEW_PAGE_BASE}/${linkId}`;

const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const SLUG_LENGTH = 8;

/** Random public link id (no 0/O/1/l/I, so it reads cleanly when typed). */
export function newReviewSlug(random: (n: number) => Uint8Array = randomBytes): string {
  const bytes = random(SLUG_LENGTH);
  let out = "";
  for (const b of bytes) out += SLUG_ALPHABET[b % SLUG_ALPHABET.length];
  return out;
}

function randomBytes(n: number) {
  return crypto.getRandomValues(new Uint8Array(n));
}

export const isReviewSlug = (value: string) =>
  value.length === SLUG_LENGTH && [...value].every((c) => SLUG_ALPHABET.includes(c));

// Business info keys the review page reads ("website" is the Business name
// field, a legacy key name).
export const REVIEW_INFO_KEYS = {
  name: "website",
  address: "businessAddress",
  phone: "businessPhone",
} as const;

export type ReviewInfoField = "name" | "address" | "logo" | "phone";

export const REVIEW_FIELD_LABELS: Record<ReviewInfoField, string> = {
  name: "Business name",
  address: "Address",
  logo: "Logo",
  phone: "Phone",
};

const first = (info: Record<string, string[]> | null | undefined, key: string) =>
  info?.[key]?.[0]?.trim() || null;

/**
 * Whether Business info has what the review page needs. Name and address are
 * required before a review link can be created; logo and phone are
 * recommended (the page works without them).
 */
export function reviewInfoStatus(
  info: Record<string, string[]> | null | undefined,
  hasLogo: boolean
): { ready: boolean; missing: ReviewInfoField[]; recommended: ReviewInfoField[] } {
  const missing: ReviewInfoField[] = [];
  if (!first(info, REVIEW_INFO_KEYS.name)) missing.push("name");
  if (!first(info, REVIEW_INFO_KEYS.address)) missing.push("address");
  const recommended: ReviewInfoField[] = [];
  if (!hasLogo) recommended.push("logo");
  if (!first(info, REVIEW_INFO_KEYS.phone)) recommended.push("phone");
  return { ready: missing.length === 0, missing, recommended };
}

/** The review page's business details: Business info first, Google place as fallback. */
export function reviewBusiness(
  info: Record<string, string[]> | null | undefined,
  place: { businessName: string; address: string | null }
) {
  return {
    name: first(info, REVIEW_INFO_KEYS.name) ?? place.businessName,
    address: first(info, REVIEW_INFO_KEYS.address) ?? place.address,
    phone: first(info, REVIEW_INFO_KEYS.phone),
  };
}

/** Ratings at or below this get the private feedback form first. */
export const PRIVATE_MAX_RATING = 4;
