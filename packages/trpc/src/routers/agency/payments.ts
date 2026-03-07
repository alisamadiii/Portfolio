import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { authenticatedProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { polarClient } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { orders, products, subscriptions } from "@workspace/drizzle/schema";

import { AgencyMetadata } from "../admin/agency/products";

export const agencyPaymentsRouter = createTRPCRouter({
  getProducts: authenticatedProcedure.query(async ({ ctx }) => {
    try {
      const product = await db
        .select()
        .from(products)
        .where(sql`${products.metadata}->>'userId' = ${ctx.session.user.id}`)
        .limit(1)
        .then((result) => result[0]);

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const metadata = product.metadata as AgencyMetadata | undefined;
      const userId = metadata?.userId;
      const email = metadata?.email;
      const services = metadata?.services;

      return {
        ...product,
        userId,
        email,
        services: services
          ? (JSON.parse(services) as { name: string; price: number }[])
          : [],
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get products",
      });
    }
  }),
  getOrders: authenticatedProcedure.query(async ({ ctx }) => {
    try {
      const ordersList = await db
        .select()
        .from(orders)
        .where(sql`${orders.metadata}->>'userId' = ${ctx.session.user.id}`);

      const subscriptionsList = await db
        .select()
        .from(subscriptions)
        .where(
          sql`${subscriptions.metadata}->>'userId' = ${ctx.session.user.id}`
        );

      return {
        orders: ordersList.map((order) => {
          const metadata = order.metadata as AgencyMetadata | undefined;
          const userId = metadata?.userId;
          const email = metadata?.email;
          const services = metadata?.services;
          return {
            ...order,
            userId,
            email,
            services: services
              ? (JSON.parse(services) as { name: string; price: number }[])
              : [],
          };
        }),
        subscriptions: subscriptionsList.map((subscription) => {
          const metadata = subscription.metadata as AgencyMetadata | undefined;
          const userId = metadata?.userId;
          const email = metadata?.email;
          const services = metadata?.services;
          return {
            ...subscription,
            userId,
            email,
            services: services
              ? (JSON.parse(services) as { name: string; price: number }[])
              : [],
          };
        }),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get orders",
      });
    }
  }),
  createCheckout: authenticatedProcedure
    .input(
      z.object({
        productId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(ctx.session.user.id);
        console.log(input.productId);
        const checkout = await polarClient.checkouts.create({
          products: [input.productId],
          externalCustomerId: ctx.session.user.id,
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
