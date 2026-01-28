import { cookies } from "next/headers";
import type { SubscriptionProrationBehavior } from "@polar-sh/sdk/models/components/subscriptionprorationbehavior.js";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq, or } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { polarClient } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { orders, products, subscriptions } from "@workspace/drizzle/schema";

export const paymentsRouter = createTRPCRouter({
  getCustomerState: authenticatedProcedure.query(async ({ ctx }) => {
    try {
      const customerState = await polarClient.customers.getStateExternal({
        externalId: ctx.session.user.id,
      });
      return customerState;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch customer state",
        cause: error,
      });
    }
  }),
  /**
   * Fetches all products ordered by price amount
   * @returns Promise<Product[]> - Array of products sorted by price
   */
  getProducts: baseProcedure.query(async () => {
    try {
      const productsList = await db
        .select()
        .from(products)
        .orderBy(asc(products.priceAmount));
      return productsList;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch products",
        cause: error,
      });
    }
  }),

  /**
   * Fetches a product by ID
   * @param id - The ID of the product to fetch
   * @returns Promise<Product> - The product
   */
  getProductById: baseProcedure.input(z.string()).query(async ({ input }) => {
    try {
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, input))
        .limit(1)
        .then((result) => result[0]);

      return product;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch product",
        cause: error,
      });
    }
  }),

  /**
   * Updates an existing product
   * @param id - The ID of the product to update
   * @param product - Partial product data to update
   * @returns The updated product
   */
  updateProduct: adminProcedure
    .input(
      z.object({
        id: z.string(),
        product: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          trialInterval: z.enum(["day", "week", "month", "year"]).optional(),
          trialIntervalCount: z.number().optional(),
          popular: z.boolean().optional(),
          slug: z.string().optional(),
          priceAmount: z.number().optional(),
          priceCurrency: z.string().optional(),
          recurringInterval: z
            .enum(["day", "week", "month", "year"])
            .optional(),
          isRecurring: z.boolean().optional(),
          isArchived: z.boolean().optional(),
          metadata: z.any().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, ...productData } = input;
        const [updatedProduct] = await db
          .update(products)
          .set({
            ...productData,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id))
          .returning();
        return updatedProduct;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to update product",
          cause: error,
        });
      }
    }),

  /**
   * Deletes a product by ID
   * @param id - The ID of the product to delete
   * @returns The deleted product
   */
  deleteProduct: adminProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      try {
        const [deletedProduct] = await db
          .delete(products)
          .where(eq(products.id, input))
          .returning();
        return deletedProduct;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to delete product",
          cause: error,
        });
      }
    }),

  /**
   * Creates a checkout session for a product
   * @param productId - The ID of the product to checkout
   * @param successUrl - Optional custom success URL
   * @param discountId - Optional discount code ID
   * @returns Checkout session response
   */
  createCheckout: authenticatedProcedure
    .input(
      z.object({
        productId: z.string(),
        successUrl: z.string().optional(),
        discountId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { productId, successUrl, discountId } = input;

        const checkoutIdPlaceholder = "{CHECKOUT_ID}";
        let url: string;
        if (successUrl) {
          const delimiter = successUrl.includes("?") ? "&" : "?";
          url = `${successUrl}${delimiter}checkout_id=${checkoutIdPlaceholder}`;
        } else {
          const base = (process.env.BETTER_AUTH_URL || "").replace(/\/$/, "");
          url = `${base}/success?checkout_id=${checkoutIdPlaceholder}`;
        }

        const response = await polarClient.checkouts.create({
          products: [productId],
          externalCustomerId: ctx.session.user.id,
          successUrl: url,
          discountId: discountId ?? undefined,
        });
        return response;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create checkout",
          cause: error,
        });
      }
    }),

  /**
   * Retrieves a checkout session by ID
   * @param checkoutId - The ID of the checkout session
   * @returns Promise<CheckoutSession> - Checkout session data
   */
  getCheckoutSession: baseProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const response = await polarClient.checkouts.get({
          id: input,
        });
        return response;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get checkout session",
          cause: error,
        });
      }
    }),

  /**
   * Switches a subscription to a different product/plan
   * @param subscriptionId - The ID of the subscription to update
   * @param toProductId - The ID of the new product/plan
   * @param prorationBehavior - Optional proration behavior
   * @returns Response from the subscription update
   */
  switchPlan: authenticatedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        toProductId: z.string(),
        prorationBehavior: z
          .enum([
            "prorate",
            "invoice",
          ] as const satisfies readonly SubscriptionProrationBehavior[])
          .optional()
          .default("prorate"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { subscriptionId, toProductId, prorationBehavior } = input;

        // Fetch the current subscription to check its status
        const subscription = await polarClient.subscriptions.get({
          id: subscriptionId,
        });

        // Check if the subscription is in trial period
        if (subscription.status === "trialing") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot switch plans while subscription is in trial period. Please wait until your trial ends or cancel and start a new subscription.",
          });
        }

        const response = await polarClient.subscriptions.update({
          id: subscriptionId,
          subscriptionUpdate: {
            productId: toProductId,
            prorationBehavior:
              prorationBehavior as SubscriptionProrationBehavior,
          },
        });
        return response;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to switch plan",
          cause: error,
        });
      }
    }),

  /**
   * Deletes a customer and clears all cookies
   * @param userId - The ID of the user/customer to delete
   * @returns Response from the customer deletion
   */
  deleteCustomer: authenticatedProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      try {
        const cookieStore = await cookies();
        await polarClient.customers.deleteExternal({
          externalId: input,
        });

        // Delete all cookies
        cookieStore.getAll().forEach((cookie) => {
          cookieStore.delete(cookie.name);
        });

        return true;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete customer",
          cause: error,
        });
      }
    }),

  /**
   * Fetches orders for a specific user by user ID or email
   * @param userId - The ID of the user to get orders for
   * @param email - The email of the user to get orders for
   * @returns Promise<Order[]> - Array of orders sorted by creation date (newest first)
   */
  getOrders: authenticatedProcedure
    .input(
      z.object({
        userId: z.string(),
        email: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { userId, email } = input;
        const ordersList = await db
          .select()
          .from(orders)
          .where(or(eq(orders.userId, userId), eq(orders.email, email)))
          .orderBy(desc(orders.createdAt));

        return ordersList;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch orders",
          cause: error,
        });
      }
    }),

  /**
   * Fetches subscriptions for a specific user by user ID
   * @param userId - The ID of the user to get subscriptions for
   * @returns Promise<Subscription[]> - Array of subscriptions sorted by creation date (newest first)
   */
  getSubscriptions: authenticatedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { userId } = input;

        const subscriptionsList = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .orderBy(desc(subscriptions.createdAt));

        return subscriptionsList;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch subscriptions",
          cause: error,
        });
      }
    }),
});
