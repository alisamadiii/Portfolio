import { OrderStatus } from "@polar-sh/sdk/models/components/orderstatus.js";
import { SubscriptionStatus } from "@polar-sh/sdk/models/components/subscriptionstatus.js";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { calcExtraPagesCost } from "@workspace/ui/lib/agency-utils";

import { authenticatedProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { polarClient } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { orders, products, subscriptions } from "@workspace/drizzle/schema";

import { AgencyMetadata } from "../admin/agency/products";

export const agencyPaymentsRouter = createTRPCRouter({
  getProducts: authenticatedProcedure.query(async ({ ctx }) => {
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
      });
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get products",
      });
    }
  }),
  isActive: authenticatedProcedure
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
              eq(orders.status, OrderStatus.Paid),
              sql`${products.metadata}->>'project' = 'AGENCY'`
            )
          )
          .limit(1);

        if (activeOrder) return true;

        const [activeSubscription] = await db
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .innerJoin(products, eq(subscriptions.productId, input.productId))
          .where(
            and(
              sql`${subscriptions.userId} = ${userId}`,
              eq(subscriptions.status, SubscriptionStatus.Active),
              sql`${products.metadata}->>'project' = 'AGENCY'`
            )
          )
          .limit(1);

        return !!activeSubscription;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to check agency status",
        });
      }
    }),
  createCheckout: authenticatedProcedure
    .input(
      z.object({
        productId: z.string(),
        successUrl: z.string().optional(),
        extraPages: z.number().int().min(0).default(0),
      })
    )
    .mutation(async ({ input, ctx }): Promise<{ url: string }> => {
      // TODO: Re-enable after Stripe migration
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Checkout is currently under construction. We're upgrading our payment system — please check back soon.",
      });

      // try {
      //   const { productId, successUrl, extraPages } = input;

      //   const checkoutIdPlaceholder = "{CHECKOUT_ID}";
      //   let url: string | undefined;
      //   if (successUrl) {
      //     const delimiter = successUrl.includes("?") ? "&" : "?";
      //     url = `${successUrl}${delimiter}checkout_id=${checkoutIdPlaceholder}`;
      //   }

      //   let priceOverride:
      //     | { [k: string]: [{ amountType: "fixed"; priceAmount: number }] }
      //     | undefined;
      //   if (extraPages > 0) {
      //     const [product] = await db
      //       .select({ priceAmount: products.priceAmount })
      //       .from(products)
      //       .where(eq(products.id, productId))
      //       .limit(1);
      //     if (product) {
      //       priceOverride = {
      //         [productId]: [
      //           {
      //             amountType: "fixed",
      //             priceAmount:
      //               product.priceAmount + calcExtraPagesCost(extraPages),
      //           },
      //         ],
      //       };
      //     }
      //   }

      //   const checkout = await polarClient.checkouts.create({
      //     products: [productId],
      //     externalCustomerId: ctx.session.user.id,
      //     successUrl: url,
      //     metadata: extraPages > 0 ? { extraPages } : undefined,
      //     prices: priceOverride,
      //   });
      //   return checkout;
      // } catch (error) {
      //   throw new TRPCError({
      //     code: "INTERNAL_SERVER_ERROR",
      //     message:
      //       error instanceof Error
      //         ? error.message
      //         : "Failed to create checkout",
      //   });
      // }
    }),
});
