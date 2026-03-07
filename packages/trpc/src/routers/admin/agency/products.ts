import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { polarClient } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { orders, products, subscriptions } from "@workspace/drizzle/schema";

export type AgencyMetadata = {
  userId?: string;
  email?: string;
  scope?: string;
};

export const adminAgencyProductsRouter = createTRPCRouter({
  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        price: z.number(),
        recurringInterval: z.enum(["day", "week", "month", "year"]),
        email: z.string(),
        scope: z.array(z.string()),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const {
          name,
          description,
          price,
          recurringInterval,
          email,
          scope,
          userId,
        } = input;

        const result = await polarClient.products.create({
          name,
          description,
          prices: [
            {
              amountType: "fixed",
              priceAmount: price * 100,
            },
          ],
          recurringInterval,
          metadata: { email, scope: JSON.stringify(scope), userId },
          visibility: "private",
        });

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create product",
          cause: error,
        });
      }
    }),
  getAllProducts: adminProcedure.query(async () => {
    try {
      const productsList = await db
        .select()
        .from(products)
        .where(sql`${products.metadata} ? 'userId'`)
        .orderBy(desc(products.createdAt))
        .limit(20);

      return productsList.map((product) => {
        const metadata = product.metadata as AgencyMetadata | undefined;
        const userId = metadata?.userId;
        const email = metadata?.email;
        const scope = metadata?.scope;
        return { ...product, userId, email, scope };
      });
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get products",
      });
    }
  }),
  getProductsByUserId: adminProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const productsList = await db
          .select()
          .from(products)
          .where(sql`${products.metadata}->>'userId' = ${input}`);

        return productsList.map((product) => {
          const metadata = product.metadata as AgencyMetadata | undefined;
          const userId = metadata?.userId;
          const email = metadata?.email;
          const scope = metadata?.scope;
          return {
            ...product,
            userId,
            email,
            scope: scope ? JSON.parse(scope) : [],
          };
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get products by user id",
        });
      }
    }),
  getOrdersByUserId: adminProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const ordersList = await db
          .select()
          .from(orders)
          .where(sql`${orders.metadata}->>'userId' = ${input}`)
          .orderBy(desc(orders.createdAt))
          .limit(20);

        const subscriptionsList = await db
          .select()
          .from(subscriptions)
          .where(sql`${subscriptions.metadata}->>'userId' = ${input}`)
          .orderBy(desc(subscriptions.createdAt))
          .limit(20);

        return { orders: ordersList, subscriptions: subscriptionsList };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get orders by product",
        });
      }
    }),
  createCheckout: adminProcedure
    .input(
      z.object({
        productId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const findProduct = await db
          .select()
          .from(products)
          .where(eq(products.id, input.productId));
        if (!findProduct) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }
        const product = findProduct[0];
        const metadata = product.metadata as AgencyMetadata | undefined;
        const userId = metadata?.userId;
        const email = metadata?.email;
        const scope = metadata?.scope;

        const checkout = await polarClient.checkouts.create({
          products: [input.productId],
          externalCustomerId: userId,
          metadata: {
            userId: userId ?? "",
            productId: input.productId,
            email: email ?? "",
            scope: JSON.stringify(scope),
          },
        });
        return checkout;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create checkout",
        });
      }
    }),
});
