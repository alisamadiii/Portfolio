// Google Reviews app: scrapes a project's Google listing with Apify
// (compass/google-maps-reviews-scraper) and saves every new review. The
// website feed picks the 5-star ones.
// Called by the hub (connect, Sync now) and the daily cron in apps/api.

import { and, eq, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { hubReview, hubReviewsSource } from "@workspace/drizzle/schema";

import {
  type ApifyReviewItem,
  type ReviewsTarget,
  isShortGoogleLink,
  parseReviewsTarget,
  pickReviews,
  placeInfo,
} from "./google-reviews-shared";
import { getPlaceDetails } from "./places";

const ACTOR = "compass~google-maps-reviews-scraper";
// First sync saves the newest 50 reviews; daily syncs only read what was
// posted since the last run.
const FIRST_SYNC_SCAN = 50;
const DAILY_SCAN = 50;
// Daily runs re-read 2 days back so a late-indexed review isn't missed.
const OVERLAP_MS = 2 * 24 * 60 * 60 * 1000;

export const isApifyConfigured = () => Boolean(process.env.APIFY_TOKEN);

/** Runs the actor and returns its dataset items. Throws on failure. */
async function runApify(target: ReviewsTarget, opts: { maxReviews: number; since?: Date }) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is not set");
  const input = {
    ...("placeId" in target ? { placeIds: [target.placeId] } : { startUrls: [{ url: target.url }] }),
    maxReviews: opts.maxReviews,
    reviewsSort: "newest",
    language: "en",
    // Needed for reviewer names and photos.
    personalData: true,
    ...(opts.since ? { reviewsStartDate: opts.since.toISOString().slice(0, 10) } : {}),
  };
  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=240`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(300_000),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apify ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as ApifyReviewItem[];
}

/**
 * Resolves a pasted link (share.google, maps.app.goo.gl, a Maps URL or a
 * bare place id) to a scraper target. Null when it isn't a Google Maps place.
 */
export async function resolveReviewsLink(input: string): Promise<ReviewsTarget | null> {
  let link = input.trim();
  if (isShortGoogleLink(link)) {
    try {
      const res = await fetch(link, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(15_000),
      });
      link = res.url;
    } catch {
      return null;
    }
  }
  return parseReviewsTarget(link);
}

/** Target string as stored on the source row. */
export const targetToUrl = (target: ReviewsTarget) =>
  "placeId" in target
    ? `https://www.google.com/maps/place/?q=place_id:${target.placeId}`
    : target.url;

export type SyncResult = { ok: true; added: number } | { ok: false; error: string };

/**
 * Scrapes one project's listing and inserts every review not saved yet. First
 * run reads the newest 50; later runs read since the last run. Never deletes
 * and never throws: errors are saved on the source row and returned.
 */
export async function syncGoogleReviews(projectId: string): Promise<SyncResult> {
  const source = await db.query.hubReviewsSource.findFirst({
    where: and(
      eq(hubReviewsSource.projectId, projectId),
      eq(hubReviewsSource.provider, "google")
    ),
  });
  if (!source) return { ok: false, error: "No Google listing connected." };

  const firstRun = !source.firstSyncedAt;
  const startedAt = new Date();
  try {
    const target: ReviewsTarget = source.externalId
      ? { placeId: source.externalId }
      : (parseReviewsTarget(source.url) ?? { url: source.url });
    const items = await runApify(target, {
      maxReviews: firstRun ? FIRST_SYNC_SCAN : DAILY_SCAN,
      since:
        firstRun || !source.lastSyncedAt
          ? undefined
          : new Date(source.lastSyncedAt.getTime() - OVERLAP_MS),
    });

    // Nothing at all on a first run means the link didn't reach a listing
    // (a place with reviews always returns items). Don't mark it synced.
    if (firstRun && items.length === 0) {
      throw new Error("Google returned no reviews for this link.");
    }

    const reviews = pickReviews(items);
    const inserted = reviews.length
      ? await db
          .insert(hubReview)
          .values(reviews.map((r) => ({ ...r, projectId, provider: "google" as const })))
          .onConflictDoNothing()
          .returning({ id: hubReview.id })
      : [];

    // Listing info rides along on review items; with no new reviews, ask
    // Places for the current rating instead (best effort).
    const info = placeInfo(items);
    const placeId = info.placeId ?? source.externalId;
    if (placeId && (info.rating == null || info.totalReviews == null)) {
      const place = await getPlaceDetails(placeId).catch(() => null);
      info.businessName ??= place?.displayName?.text ?? null;
      info.rating ??= place?.rating ?? null;
      info.totalReviews ??= place?.userRatingCount ?? null;
    }

    await db
      .update(hubReviewsSource)
      .set({
        externalId: placeId,
        businessName: info.businessName ?? source.businessName,
        rating: info.rating ?? source.rating,
        totalReviews: info.totalReviews ?? source.totalReviews,
        firstSyncedAt: source.firstSyncedAt ?? startedAt,
        lastSyncedAt: startedAt,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(hubReviewsSource.id, source.id));
    return { ok: true, added: inserted.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[google-reviews] sync failed for ${projectId}`, message);
    await db
      .update(hubReviewsSource)
      .set({ lastError: message.slice(0, 500), updatedAt: sql`now()` })
      .where(eq(hubReviewsSource.id, source.id));
    return { ok: false, error: message };
  }
}
