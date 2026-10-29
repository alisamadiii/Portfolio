import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import {
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import {
  orders,
  products,
  projectsTypeValues,
} from "@workspace/drizzle/schema";
import type { ProjectType } from "@workspace/drizzle/schema";
import {
  priceIdVariants,
  pricesFor,
  SELF_SERVE_PLANS,
} from "@workspace/trpc/lib/payment/plans";

// ─── Types ──────────────────────────────────────────────────────

export type AgencyMetadata = {
  userId?: string;
  email?: string;
  services?: string;
  project?: ProjectType;
};

// ─── Router ─────────────────────────────────────────────────────

export const productsRouter = createTRPCRouter({
  // ─── Public ────────────────────────────────────────────────────

  list: baseProcedure.query(async () => {
    try {
      const productsList = await db
        .select()
        .from(products)
        .orderBy(asc(products.priceAmount));
      return productsList;
    } catch (error: unknown) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch products",
        cause: error,
      });
    }
  }),

  // The Stripe product behind a self-serve plan, matched on the plan's
  // recurring price (several products share metadata.project = "AGENCY").
  getForPlan: baseProcedure
    .input(z.enum(SELF_SERVE_PLANS))
    .query(async ({ input }) => {
      const priceId = pricesFor(input)?.recurring;
      const [product] = priceId
        ? await db
            .select()
            .from(products)
            .where(inArray(products.stripePriceId, [...priceIdVariants(priceId)]))
            .limit(1)
        : [];
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No product found for plan "${input}"`,
        });
      }
      return product;
    }),

  getByProject: baseProcedure
    .input(z.enum(projectsTypeValues))
    .query(async ({ input }) => {
      try {
        const [product] = await db
          .select()
          .from(products)
          .where(
            sql`${products.metadata}->>'project' = ${input} AND ${products.isArchived} = false`
          )
          .limit(1);
        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `No product found for project "${input}"`,
          });
        }
        return product;
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch product",
          cause: error,
        });
      }
    }),

  // ─── Authenticated ─────────────────────────────────────────────

  isPurchased: authenticatedProcedure
    .input(z.object({ project: z.enum(projectsTypeValues) }))
    .query(async ({ input, ctx }) => {
      const [row] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.userId, ctx.session.user.id),
            eq(orders.status, "paid"),
            sql`${orders.metadata}->>'project' = ${input.project}`
          )
        )
        .limit(1);

      return !!row;
    }),
});
