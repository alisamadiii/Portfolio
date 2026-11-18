// Pure helpers for the Google Reviews app (no db, no network): turning a
// pasted Google link into something the scraper can start from, mapping
// Apify review items, and picking which reviews to save. Unit-tested in
// apps/hub/lib/google-reviews.test.ts.

/** Where the scraper starts: a place id once known, else a Maps URL. */
export type ReviewsTarget = { placeId: string } | { url: string };

const PLACE_ID_RE = /^ChIJ[\w-]{10,}$/;
// Google "feature id" in a Maps data path: !1s0x<hex>:0x<hex>. The second half
// is the listing's CID. Only the !1s one is the place itself: place URLs also
// carry !5s0x…:0x… (the building or plaza around it), never use that one.
const FEATURE_ID_RE = /!1s0x[0-9a-f]+:(0x[0-9a-f]+)/i;

/**
 * Normalizes a Google Maps link (already redirect-resolved) or a bare place
 * id into a scraper target. Review share links (/maps/reviews/...) carry only
 * the feature id, so they become a ?cid= place URL. Returns null for anything
 * that isn't a Google Maps place.
 */
export function parseReviewsTarget(input: string): ReviewsTarget | null {
  const raw = input.trim();
  if (PLACE_ID_RE.test(raw)) return { placeId: raw };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (!/^(google\.[a-z.]+|maps\.google\.[a-z.]+)$/.test(host)) return null;

  const placeId =
    url.searchParams.get("placeid") ??
    url.searchParams.get("query_place_id") ??
    url.searchParams.get("q")?.match(/^place_id:(.+)$/)?.[1];
  if (placeId && PLACE_ID_RE.test(placeId)) return { placeId };

  const cid = url.searchParams.get("cid");
  if (cid && /^\d+$/.test(cid)) return { url: `https://www.google.com/maps?cid=${cid}` };

  const feature = decodeURIComponent(url.pathname + url.search).match(FEATURE_ID_RE);
  if (feature) {
    return { url: `https://www.google.com/maps?cid=${BigInt(feature[1]!).toString()}` };
  }

  if (url.pathname.startsWith("/maps/place/")) {
    return { url: `https://www.google.com${url.pathname}` };
  }
  return null;
}

/** Hosts whose short links we follow server-side before parsing. */
export const isShortGoogleLink = (input: string) => {
  try {
    const host = new URL(input.trim()).hostname;
    return host === "share.google" || host === "maps.app.goo.gl" || host === "goo.gl" || host === "g.co";
  } catch {
    return false;
  }
};

export const writeReviewUrl = (placeId: string) =>
  `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

/** One review item from compass/google-maps-reviews-scraper (fields we use). */
export interface ApifyReviewItem {
  reviewId?: string | null;
  name?: string | null;
  reviewerPhotoUrl?: string | null;
  stars?: number | null;
  text?: string | null;
  publishedAtDate?: string | null;
  responseFromOwnerText?: string | null;
  responseFromOwnerDate?: string | null;
  reviewUrl?: string | null;
  // Place fields, repeated on every item.
  placeId?: string | null;
  title?: string | null;
  totalScore?: number | null;
  reviewsCount?: number | null;
}

export interface SavedReview {
  reviewId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  text: string | null;
  publishedAt: Date;
  ownerReply: string | null;
  ownerReplyAt: Date | null;
  reviewUrl: string | null;
}

const toDate = (value: string | null | undefined) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Google review text comes with <br> tags for line breaks. Turns them into
 * newlines, drops any other tag, and trims; null when nothing is left.
 */
export const cleanReviewText = (value: string | null | undefined) =>
  value
    ?.replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim() || null;

/** Maps an Apify item; null when it lacks what a saved review needs. */
export function toSavedReview(item: ApifyReviewItem): SavedReview | null {
  const publishedAt = toDate(item.publishedAtDate);
  const text = cleanReviewText(item.text);
  if (!item.reviewId || !publishedAt || typeof item.stars !== "number") return null;
  return {
    reviewId: item.reviewId,
    authorName: item.name?.trim() || "Google user",
    authorPhotoUrl: item.reviewerPhotoUrl || null,
    rating: item.stars,
    text,
    publishedAt,
    ownerReply: cleanReviewText(item.responseFromOwnerText),
    ownerReplyAt: toDate(item.responseFromOwnerDate),
    reviewUrl: item.reviewUrl || null,
  };
}

/**
 * The reviews a sync saves: every scraped review, any rating, newest first,
 * one per review id (the db skips ones already saved). Choosing what the
 * website shows (5 stars with text) happens in the public feed, not here.
 */
export function pickReviews(items: ApifyReviewItem[]): SavedReview[] {
  const seen = new Set<string>();
  return items
    .map(toSavedReview)
    .filter((r): r is SavedReview => r !== null)
    .filter((r) => (seen.has(r.reviewId) ? false : (seen.add(r.reviewId), true)))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

/** What the website feed shows: 5 stars, written text, not hidden. */
export const isFeedReview = (r: { rating: number; text: string | null; hidden: boolean }) =>
  r.rating === 5 && !!r.text?.trim() && !r.hidden;

/** Listing info from the first item that has it. */
export function placeInfo(items: ApifyReviewItem[]) {
  const pick = <K extends keyof ApifyReviewItem>(key: K) =>
    items.find((i) => i[key] != null)?.[key] ?? null;
  return {
    placeId: pick("placeId") as string | null,
    businessName: pick("title") as string | null,
    rating: pick("totalScore") as number | null,
    totalReviews: pick("reviewsCount") as number | null,
  };
}
