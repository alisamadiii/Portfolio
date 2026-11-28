// Business details on hub_project: client-safe types, limits and the Google
// URLs derived from the place id. Shared by the hub Settings cards, the
// Feedback and Google Reviews apps and the public review endpoints.

export type ProjectBusiness = {
  name: string | null;
  phone: string | null;
  address: string | null;
  /** Multiline, as typed. */
  hours: string | null;
  googlePlaceId: string | null;
  /** Normalized https://g.page/r/<code>/review, or null. */
  googleReviewUrl: string | null;
};

export const BUSINESS_FIELD_KEYS = [
  "name",
  "phone",
  "address",
  "hours",
  "googlePlaceId",
  "googleReviewUrl",
] as const satisfies readonly (keyof ProjectBusiness)[];

export const BUSINESS_LIMITS = {
  name: 80,
  phone: 40,
  address: 300,
  hours: 1000,
  googlePlaceId: 300,
  googleReviewUrl: 500,
} as const satisfies Record<keyof ProjectBusiness, number>;

/** A Google place id as Places and Maps hand them out. */
export const PLACE_ID_RE = /^ChIJ[\w-]{10,}$/;

/** The listing on Google Maps. */
export const googleMapsUrl = (placeId: string) =>
  `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;

/** The Google "write a review" page for a place. */
export const writeReviewUrl = (placeId: string) =>
  `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

/** Where a 5-star customer is sent: the pasted Business Profile link, else the place id link. */
export const reviewTargetUrl = (b: Pick<ProjectBusiness, "googlePlaceId" | "googleReviewUrl">) =>
  b.googleReviewUrl ?? (b.googlePlaceId ? writeReviewUrl(b.googlePlaceId) : null);

/**
 * The pasted Business Profile review link (g.page/r/<code>/review),
 * normalized, or null. It is the only link Google guarantees opens the
 * review form for the business.
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
