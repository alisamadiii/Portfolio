import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, lt, lte, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import {
  agencyClient,
  hubProject,
  hubReviewFeedback,
  hubReviewLink,
} from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import { requireApp } from "../lib/payment/entitlements";
import { getPlaceDetails, searchPlacesLite } from "../lib/places";
import {
  REVIEW_FIELD_LABELS,
  REVIEW_INFO_KEYS,
  newReviewSlug,
  reviewInfoStatus,
  reviewPageUrl,
} from "../lib/review-link-shared";

// Feedback app: one public review link per project. Customers rate 1 to 5;
// 5 stars are sent to Google, lower ratings leave private feedback that shows
// here. The public side is apps/api /api/review/[id].
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

/** Business info + logo, and whether they're enough for the review page. */
async function businessFor(projectId: string) {
  const [project, client] = await Promise.all([
    db.query.hubProject.findFirst({
      where: eq(hubProject.id, projectId),
      columns: { logoKey: true },
    }),
    db.query.agencyClient.findFirst({
      where: eq(agencyClient.projectId, projectId),
      columns: { businessInfo: true },
    }),
  ]);
  const info = client?.businessInfo ?? null;
  return { info, status: reviewInfoStatus(info, !!project?.logoKey) };
}

const RATING_FILTERS = ["all", "5", "4", "3", "low"] as const;
const PAGE_SIZE = 50;

export const feedbackRouter = createTRPCRouter({
  /** Setup state: is Business info ready, and the link if it exists. */
  status: appCmsProcedure.query(async ({ ctx }) => {
    const [{ info, status }, link] = await Promise.all([
      businessFor(ctx.projectId),
      db.query.hubReviewLink.findFirst({
        where: eq(hubReviewLink.projectId, ctx.projectId),
      }),
    ]);
    const name = info?.[REVIEW_INFO_KEYS.name]?.[0]?.trim() ?? "";
    const address = info?.[REVIEW_INFO_KEYS.address]?.[0]?.trim() ?? "";
    return {
      ...status,
      // Prefills the Google Maps search.
      defaultQuery: [name, address].filter(Boolean).join(", "),
      link: link
        ? {
            id: link.id,
            url: reviewPageUrl(link.id),
            placeId: link.placeId,
            businessName: link.businessName,
            address: link.address,
          }
        : null,
    };
  }),

  /** Find the business on Google Maps. Runs on submit, never per keystroke. */
  search: appCmsFullAccessProcedure
    .input(z.object({ query: z.string().trim().min(2).max(200) }))
    .mutation(async ({ input }) => {
      const result = await searchPlacesLite(input.query);
      if (result.error) {
        console.error("[feedback] places search failed", result.error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Google Maps search failed. Try again in a moment.",
        });
      }
      return result.places.map((p) => ({
        placeId: p.id,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? null,
      }));
    }),

  /** Save the Google place. Keeps the existing slug so shared links keep working. */
  setPlace: appCmsFullAccessProcedure
    .input(z.object({ placeId: z.string().trim().min(1).max(300) }))
    .mutation(async ({ ctx, input }) => {
      const { status } = await businessFor(ctx.projectId);
      if (!status.ready) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Add your ${status.missing
            .map((f) => REVIEW_FIELD_LABELS[f].toLowerCase())
            .join(" and ")} in Business info first.`,
        });
      }

      let place;
      try {
        place = await getPlaceDetails(input.placeId);
      } catch (error) {
        console.error("[feedback] place details failed", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "We couldn't find that business on Google Maps.",
        });
      }
      const values = {
        placeId: place.id,
        businessName: place.displayName?.text ?? "",
        address: place.formattedAddress ?? null,
        updatedAt: new Date(),
      };

      const [row] = await db
        .insert(hubReviewLink)
        .values({ id: newReviewSlug(), projectId: ctx.projectId, ...values })
        .onConflictDoUpdate({ target: hubReviewLink.projectId, set: values })
        .returning();
      return { id: row!.id, url: reviewPageUrl(row!.id) };
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
