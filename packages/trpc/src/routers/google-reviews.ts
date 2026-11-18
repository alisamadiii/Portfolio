import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, lt, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import { hubReview, hubReviewLink, hubReviewsSource } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import { isAdminUser } from "../lib/authz-shared";
import {
  isApifyConfigured,
  resolveReviewsLink,
  syncGoogleReviews,
  targetToUrl,
} from "../lib/google-reviews";
import { cleanReviewText, isFeedReview, writeReviewUrl } from "../lib/google-reviews-shared";
import { requireApp } from "../lib/payment/entitlements";

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
const SYNC_COOLDOWN_MS = 10 * 60 * 1000;

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
    const [source, counts, feedbackLink] = await Promise.all([
      googleSource(ctx.projectId),
      db
        .select({
          saved: count(),
          // Same rule as isFeedReview: 5 stars, written text, not hidden.
          visible: sql<number>`count(*) filter (where ${hubReview.rating} = 5 and coalesce(trim(${hubReview.text}), '') <> '' and not ${hubReview.hidden})::int`,
        })
        .from(hubReview)
        .where(and(eq(hubReview.projectId, ctx.projectId), eq(hubReview.provider, "google"))),
      db.query.hubReviewLink.findFirst({
        where: eq(hubReviewLink.projectId, ctx.projectId),
        columns: { placeId: true },
      }),
    ]);
    return {
      // The Feedback app's place, offered as a one-click connect.
      suggestedPlaceId: source ? null : (feedbackLink?.placeId ?? null),
      source: source
        ? {
            url: source.url,
            placeId: source.externalId,
            businessName: source.businessName,
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

  /** Connect (or change) the Google listing, then run the first sync. */
  connect: appCmsFullAccessProcedure
    .input(z.object({ link: z.string().trim().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      if (!isApifyConfigured()) throw notConfigured();
      const target = await resolveReviewsLink(input.link);
      if (!target) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "That isn't a Google Maps business link. Open your business on Google Maps, tap Share, and paste the link.",
        });
      }

      const existing = await googleSource(ctx.projectId);
      const url = targetToUrl(target);
      const externalId = "placeId" in target ? target.placeId : null;
      // A different listing starts over: its reviews aren't this business's.
      if (existing && existing.url !== url) {
        await db
          .delete(hubReview)
          .where(and(eq(hubReview.projectId, ctx.projectId), eq(hubReview.provider, "google")));
      }
      const values = {
        url,
        externalId,
        businessName: null,
        rating: null,
        totalReviews: null,
        firstSyncedAt: null,
        lastSyncedAt: null,
        lastError: null,
        updatedAt: new Date(),
      };
      if (!existing || existing.url !== url) {
        await db
          .insert(hubReviewsSource)
          .values({ projectId: ctx.projectId, provider: "google", ...values })
          .onConflictDoUpdate({
            target: [hubReviewsSource.projectId, hubReviewsSource.provider],
            set: values,
          });
      }

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
    if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Connect your Google listing first." });
    const last = source.lastSyncedAt?.getTime() ?? 0;
    if (!isAdminUser(ctx.user) && Date.now() - last < SYNC_COOLDOWN_MS) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Reviews were just synced. Try again in a few minutes.",
      });
    }
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
