import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { polarClient } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { orders, products, subscriptions } from "@workspace/drizzle/schema";

export const adminAgencyProductsRouter = createTRPCRouter({
  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        price: z.number(),
        recurringInterval: z.enum(["day", "week", "month", "year"]),
        metadata: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { name, description, price, recurringInterval, metadata } = input;

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
          metadata,
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
        .orderBy(desc(products.createdAt))
        .limit(20);
      return productsList;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get products",
      });
    }
  }),
  getOrdersByProduct: adminProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const ordersList = await db
          .select()
          .from(orders)
          .where(eq(orders.productId, input))
          .orderBy(desc(orders.createdAt))
          .limit(20);

        const subscriptionsList = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.productId, input))
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
        const checkout = await polarClient.checkouts.create({
          products: [input.productId],
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
