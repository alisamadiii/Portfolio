// Feedback app: client-safe helpers shared by the hub, the tRPC router and
// the public /api/review endpoint.

import { writeReviewUrl } from "./project-business-shared";

export const REVIEW_PAGE_BASE = "https://www.alisamadii.com/review";

/** The Google "write a review" page for a place. */
export const googleReviewUrl = writeReviewUrl;

export const reviewPageUrl = (linkId: string) => `${REVIEW_PAGE_BASE}/${linkId}`;

/**
 * The pasted Business Profile review link (g.page/r/<code>/review),
 * normalized, or null. Required before a review link goes live: it is the
 * only link Google guarantees opens the review form for the business.
 */
export function parseGoogleReviewUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (host === "g.page") {
    const m = url.pathname.match(/^\/r\/([A-Za-z0-9_-]+)\/review\/?$/);
    return m ? `https://g.page/r/${m[1]}/review` : null;
  }
  return null;
}

/**
 * The Google Maps search for the business: its name plus the city part of
 * the address ("Jacksonville, FL 32216"). The street is left out on purpose,
 * it makes Google return the bare address instead of the business.
 */
export function businessSearchQuery(name: string, address: string): string {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^(usa|us|united states)$/i.test(p));
  const area = parts.length >= 3 ? parts.slice(-2).join(", ") : "";
  return [name.trim(), area].filter(Boolean).join(", ");
}

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

export type ReviewInfoField = "name" | "address" | "logo" | "phone";

export const REVIEW_FIELD_LABELS: Record<ReviewInfoField, string> = {
  name: "Business name",
  address: "Address",
  logo: "Logo",
  phone: "Phone",
};

const has = (value: string | null | undefined) => !!value?.trim();

/**
 * Whether Settings has what the review page needs. Name and address are
 * required before a review link goes live; logo and phone are recommended
 * (the page works without them).
 */
export function reviewInfoStatus(business: {
  name: string | null;
  address: string | null;
  phone: string | null;
  logoKey: string | null;
}): { ready: boolean; missing: ReviewInfoField[]; recommended: ReviewInfoField[] } {
  const missing: ReviewInfoField[] = [];
  if (!has(business.name)) missing.push("name");
  if (!has(business.address)) missing.push("address");
  const recommended: ReviewInfoField[] = [];
  if (!has(business.logoKey)) recommended.push("logo");
  if (!has(business.phone)) recommended.push("phone");
  return { ready: missing.length === 0, missing, recommended };
}

/** Ratings at or below this get the private feedback form first. */
export const PRIVATE_MAX_RATING = 4;
