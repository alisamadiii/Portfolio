import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, lt, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import { hubProject, hubReview, hubReviewsSource } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import { bindGoogleSource, isApifyConfigured, syncGoogleReviews } from "../lib/google-reviews";
import { cleanReviewText, isFeedReview, writeReviewUrl } from "../lib/google-reviews-shared";
import { requireApp } from "../lib/payment/entitlements";
import { rateLimit } from "../middleware/rate-limit";

// Google Reviews app: the project's Google listing is scraped (Apify) on
// connect and then daily by apps/api /api/cron/google-reviews. Every new
// review is added, never replaced; the website feed shows the 5-star ones. The website reads them through
// apps/api /api/agency/reviews/[projectId] (public/reviews.js).
const appGate = <T extends { user: { email: string; role?: string | null }; projectId: string }>(ctx: T) =>
  requireApp(ctx.user, ctx.projectId, "google-reviews");
const appCmsProcedure = cmsProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});
const appCmsFullAccessProcedure = cmsFullAccessProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});

const PAGE_SIZE = 50;
// Every manual run (connect, Sync now) is a paid Apify run.
const SCRAPE_LIMIT = { max: 3, windowMs: 10 * 60 * 1000, scope: "google-reviews" };

const googleSource = (projectId: string) =>
  db.query.hubReviewsSource.findFirst({
    where: and(eq(hubReviewsSource.projectId, projectId), eq(hubReviewsSource.provider, "google")),
  });

const notConfigured = () =>
  new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Google review syncing isn't set up yet. Contact support.",
  });

export const googleReviewsRouter = createTRPCRouter({
  /** The connected listing (null = not connected) and review counts. */
  get: appCmsProcedure.query(async ({ ctx }) => {
    const [source, counts, project] = await Promise.all([
      googleSource(ctx.projectId),
      db
        .select({
          saved: count(),
          // Same rule as isFeedReview: 5 stars, written text, not hidden.
          visible: sql<number>`count(*) filter (where ${hubReview.rating} = 5 and coalesce(trim(${hubReview.text}), '') <> '' and not ${hubReview.hidden})::int`,
        })
        .from(hubReview)
        .where(and(eq(hubReview.projectId, ctx.projectId), eq(hubReview.provider, "google"))),
      db.query.hubProject.findFirst({
        where: eq(hubProject.id, ctx.projectId),
        columns: { name: true, address: true, googlePlaceId: true },
      }),
    ]);
    return {
      // The listing from Settings; syncing starts with one click.
      placeId: project?.googlePlaceId ?? null,
      businessName: project?.name ?? null,
      address: project?.address ?? null,
      source: source
        ? {
            url: source.url,
            placeId: source.externalId,
            rating: source.rating,
            totalReviews: source.totalReviews,
            writeReviewUrl: source.externalId ? writeReviewUrl(source.externalId) : null,
            firstSyncedAt: source.firstSyncedAt?.toISOString() ?? null,
            lastSyncedAt: source.lastSyncedAt?.toISOString() ?? null,
            lastError: source.lastError,
          }
        : null,
      saved: counts[0]?.saved ?? 0,
      visible: counts[0]?.visible ?? 0,
    };
  }),

  /** Start syncing the Google listing from Settings, then run the first sync. */
  connect: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    if (!isApifyConfigured()) throw notConfigured();
    const project = await db.query.hubProject.findFirst({
      where: eq(hubProject.id, ctx.projectId),
      columns: { googlePlaceId: true },
    });
    if (!project?.googlePlaceId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Set your Google listing in Settings first.",
      });
    }
    await rateLimit(SCRAPE_LIMIT.max, SCRAPE_LIMIT.windowMs, SCRAPE_LIMIT.scope);
    await bindGoogleSource(ctx.projectId, project.googlePlaceId);

    const result = await syncGoogleReviews(ctx.projectId);
    if (!result.ok) {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "We saved your listing but couldn't read its reviews yet. Try Sync now in a minute.",
      });
    }
    return { added: result.added };
  }),

  /** Re-scrape now instead of waiting for the daily run. */
  syncNow: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    if (!isApifyConfigured()) throw notConfigured();
    const source = await googleSource(ctx.projectId);
    if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Start syncing your Google listing first." });
    await rateLimit(SCRAPE_LIMIT.max, SCRAPE_LIMIT.windowMs, SCRAPE_LIMIT.scope);
    const result = await syncGoogleReviews(ctx.projectId);
    if (!result.ok) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: "Couldn't read your Google reviews. Try again later." });
    }
    return { added: result.added };
  }),

  list: appCmsProcedure
    .input(
      z.object({
        rating: z.enum(["all", "5", "low"]).default("all"),
        cursor: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(hubReview)
        .where(
          and(
            eq(hubReview.projectId, ctx.projectId),
            eq(hubReview.provider, "google"),
            input.rating === "5"
              ? eq(hubReview.rating, 5)
              : input.rating === "low"
                ? lt(hubReview.rating, 5)
                : undefined,
            input.cursor ? lt(hubReview.publishedAt, new Date(input.cursor)) : undefined
          )
        )
        .orderBy(desc(hubReview.publishedAt))
        .limit(PAGE_SIZE + 1);
      const page = rows.slice(0, PAGE_SIZE);
      return {
        items: page.map((r) => ({
          id: r.id,
          authorName: r.authorName,
          authorPhotoUrl: r.authorPhotoUrl,
          rating: r.rating,
          text: cleanReviewText(r.text),
          publishedAt: r.publishedAt.toISOString(),
          reviewUrl: r.reviewUrl,
          hidden: r.hidden,
          onWebsite: isFeedReview(r),
        })),
        nextCursor:
          rows.length > PAGE_SIZE ? page[page.length - 1]!.publishedAt.toISOString() : null,
      };
    }),

  /** Hide a review from the website feed (or show it again). */
  setHidden: appCmsFullAccessProcedure
    .input(z.object({ id: z.string().uuid(), hidden: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(hubReview)
        .set({ hidden: input.hidden })
        .where(and(eq(hubReview.id, input.id), eq(hubReview.projectId, ctx.projectId)));
      return { ok: true };
    }),

  /** Remove the listing and every saved review. */
  disconnect: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    await db
      .delete(hubReview)
      .where(and(eq(hubReview.projectId, ctx.projectId), eq(hubReview.provider, "google")));
    await db
      .delete(hubReviewsSource)
      .where(
        and(eq(hubReviewsSource.projectId, ctx.projectId), eq(hubReviewsSource.provider, "google"))
      );
    return { ok: true };
  }),
});
