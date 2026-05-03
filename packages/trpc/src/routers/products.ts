import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";
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
  subscription,
} from "@workspace/drizzle/schema";
import type { ProjectType } from "@workspace/drizzle/schema";

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

  listAgency: authenticatedProcedure.query(async ({ ctx }) => {
    try {
      const productsList = await db
        .select()
        .from(products)
        .where(
          and(
            sql`${products.metadata}->>'project' = 'AGENCY' and (${products.metadata}->>'userId' = ${ctx.session.user.id} or ${products.metadata}->>'userId' is null or ${products.metadata}->>'userId' = '')`,
            eq(products.isArchived, false)
          )
        )
        .orderBy(asc(products.priceAmount));

      return productsList.map((product) => {
        const metadata = product.metadata as AgencyMetadata | undefined;
        return {
          ...product,
          userId: metadata?.userId,
          email: metadata?.email,
          services: metadata?.services
            ? (JSON.parse(metadata.services) as {
                name: string;
                price: number;
              }[])
            : [],
        };
      });
    } catch (error: unknown) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get products",
      });
    }
  }),

  isAgencyActive: authenticatedProcedure
    .input(
      z.object({
        productId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.session.user.id;

        const [activeOrder] = await db
          .select({ id: orders.id })
          .from(orders)
          .innerJoin(products, eq(orders.productId, input.productId))
          .where(
            and(
              sql`${orders.userId} = ${userId}`,
              eq(orders.status, "paid"),
              sql`${products.metadata}->>'project' = 'AGENCY'`
            )
          )
          .limit(1);

        if (activeOrder) return true;

        const [activeSub] = await db
          .select({ id: subscription.id })
          .from(subscription)
          .where(
            and(
              eq(subscription.referenceId, userId),
              eq(subscription.status, "active")
            )
          )
          .limit(1);

        return !!activeSub;
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to check agency status",
        });
      }
    }),

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
