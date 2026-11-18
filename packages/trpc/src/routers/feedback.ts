import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, lt, lte, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import { hubReviewFeedback, hubReviewLink } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import { requireApp } from "../lib/payment/entitlements";
import { getProjectBusiness, setProjectBusiness } from "../lib/project-business";
import {
  businessSearchQuery,
  newReviewSlug,
  parseGoogleReviewUrl,
  reviewInfoStatus,
  reviewPageUrl,
} from "../lib/review-link-shared";

// Feedback app: one public review link per project. Customers rate 1 to 5;
// 5 stars are sent to Google, lower ratings leave private feedback that shows
// here. The business and its Google place live on hub_project (Settings);
// this router only owns the public slug and the ratings. The public side is
// apps/api /api/review/[id].
const appGate = <T extends { user: { email: string; role?: string | null }; projectId: string }>(ctx: T) =>
  requireApp(ctx.user, ctx.projectId, "feedback");
const appCmsProcedure = cmsProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});
const appCmsFullAccessProcedure = cmsFullAccessProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});

const RATING_FILTERS = ["all", "5", "4", "3", "low"] as const;
const PAGE_SIZE = 50;

export const feedbackRouter = createTRPCRouter({
  /** Setup state: the business from Settings, and the link if it exists. */
  status: appCmsProcedure.query(async ({ ctx }) => {
    const [business, link] = await Promise.all([
      getProjectBusiness(ctx.projectId),
      db.query.hubReviewLink.findFirst({
        where: eq(hubReviewLink.projectId, ctx.projectId),
        columns: { id: true },
      }),
    ]);
    if (!business) throw new TRPCError({ code: "NOT_FOUND" });
    const status = reviewInfoStatus(business);

    return {
      ...status,
      // Prefills the Google Maps search (name + city, never the street).
      defaultQuery: businessSearchQuery(business.name ?? "", business.address ?? ""),
      placeId: business.googlePlaceId,
      businessName: business.name,
      address: business.address,
      link: link
        ? {
            id: link.id,
            url: reviewPageUrl(link.id),
            // Required before the link goes live (null = not pasted yet).
            googleUrl: business.googleReviewUrl,
          }
        : null,
    };
  }),

  /**
   * Create the public link for the Google listing from Settings. Keeps the
   * existing slug so shared links keep working.
   */
  createLink: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const business = await getProjectBusiness(ctx.projectId);
    if (!business?.googlePlaceId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Set your Google listing in Settings first.",
      });
    }
    const [row] = await db
      .insert(hubReviewLink)
      .values({ id: newReviewSlug(), projectId: ctx.projectId })
      .onConflictDoUpdate({ target: hubReviewLink.projectId, set: { updatedAt: new Date() } })
      .returning({ id: hubReviewLink.id });
    return { id: row!.id, url: reviewPageUrl(row!.id) };
  }),

  /** The Business Profile review link. Required: the review page is live only once it's set. */
  setGoogleUrl: appCmsFullAccessProcedure
    .input(z.object({ url: z.string().trim().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const url = parseGoogleReviewUrl(input.url);
      if (!url) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paste the review link from your Google Business Profile (g.page/r/.../review).",
        });
      }
      const link = await db.query.hubReviewLink.findFirst({
        where: eq(hubReviewLink.projectId, ctx.projectId),
        columns: { id: true },
      });
      if (!link) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Set up your review link first." });
      }
      await setProjectBusiness(ctx.projectId, { googleReviewUrl: url });
      return { ok: true };
    }),

  list: appCmsProcedure
    .input(
      z.object({
        rating: z.enum(RATING_FILTERS).default("all"),
        cursor: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const rating =
        input.rating === "all"
          ? undefined
          : input.rating === "low"
            ? lte(hubReviewFeedback.rating, 2)
            : eq(hubReviewFeedback.rating, Number(input.rating));
      const rows = await db
        .select()
        .from(hubReviewFeedback)
        .where(
          and(
            eq(hubReviewFeedback.projectId, ctx.projectId),
            rating,
            input.cursor ? lt(hubReviewFeedback.createdAt, new Date(input.cursor)) : undefined
          )
        )
        .orderBy(desc(hubReviewFeedback.createdAt))
        .limit(PAGE_SIZE + 1);
      const page = rows.slice(0, PAGE_SIZE);
      return {
        items: page.map((r) => ({
          id: r.id,
          rating: r.rating,
          message: r.message,
          name: r.name,
          contact: r.contact,
          wentToGoogle: r.wentToGoogle,
          createdAt: r.createdAt.toISOString(),
        })),
        nextCursor:
          rows.length > PAGE_SIZE ? page[page.length - 1]!.createdAt.toISOString() : null,
      };
    }),

  stats: appCmsProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select({
        total: count(),
        average: sql<string | null>`avg(${hubReviewFeedback.rating})`,
        toGoogle: sql<number>`count(*) filter (where ${hubReviewFeedback.wentToGoogle})::int`,
        private: sql<number>`count(*) filter (where ${hubReviewFeedback.message} is not null)::int`,
      })
      .from(hubReviewFeedback)
      .where(eq(hubReviewFeedback.projectId, ctx.projectId));
    return {
      total: row?.total ?? 0,
      average: row?.average == null ? null : Number(row.average),
      toGoogle: row?.toGoogle ?? 0,
      private: row?.private ?? 0,
    };
  }),

  remove: appCmsFullAccessProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(hubReviewFeedback)
        .where(
          and(
            eq(hubReviewFeedback.id, input.id),
            eq(hubReviewFeedback.projectId, ctx.projectId)
          )
        );
      return { ok: true };
    }),
});
