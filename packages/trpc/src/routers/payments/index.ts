import type { SubscriptionProrationBehavior } from "@polar-sh/sdk/models/components/subscriptionprorationbehavior.js";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq, or } from "drizzle-orm";
import { z } from "zod";

import { resolveRedirectUrl, urls } from "@workspace/ui/lib/company";

import {
  adminProcedure,
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { polarClient } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import {
  orders,
  previousCustomers,
  products,
  ProjectType,
  subscriptions,
} from "@workspace/drizzle/schema";

import { stripeRouter } from "./stripe";

export const paymentsRouter = createTRPCRouter({
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

  updateProduct: adminProcedure
    .input(
      z.object({
        id: z.string(),
        product: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          popular: z.boolean().optional(),
          isArchived: z.boolean().optional(),
          metadata: z.any().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
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
    }),

  createCheckout: authenticatedProcedure
    .input(
      z.object({
        productId: z.string(),
        /** Where the portal success page sends the user once they're done. */
        callbackUrl: z.string().optional(),
        project: z
          .enum(["MOTION", "AGENCY", "DOCS", "TEMPLATE", "SAASKIT"])
          .optional(),
        discountId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }): Promise<{ url: string }> => {
      try {
        const { productId, callbackUrl, project, discountId } = input;

        // Ensure customer exists in Polar with user.id as externalId
        try {
          await polarClient.customers.getExternal({
            externalId: ctx.session.user.id,
          });
        } catch {
          await polarClient.customers.create({
            email: ctx.session.user.email,
            name: ctx.session.user.name,
            externalId: ctx.session.user.id,
          });
        }

        // Every checkout lands on the portal success page — it is the single
        // source of truth for purchase confirmation across all apps.
        const params = new URLSearchParams();
        params.set("callbackUrl", resolveRedirectUrl(callbackUrl, urls.portal));
        if (project) params.set("project", project);

        // `{CHECKOUT_ID}` is a Polar placeholder and must stay unencoded, so it
        // is appended after URLSearchParams has done its escaping.
        const base = urls.portal.replace(/\/$/, "");
        const url = `${base}/success?${params.toString()}&checkout_id={CHECKOUT_ID}`;

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

  // Mints the buyer's Polar customer portal URL (manage billing, connect the
  // GitHub benefit). Same source as the Better Auth `customer/portal` route,
  // exposed over tRPC so non-Next clients use the one shared router too.
  customerPortal: authenticatedProcedure
    .input(z.object({ returnUrl: z.string().optional() }).optional())
    .mutation(async ({ input, ctx }): Promise<{ url: string }> => {
      try {
        const session = await polarClient.customerSessions.create({
          externalCustomerId: ctx.session.user.id,
          returnUrl: input?.returnUrl,
        });
        return { url: session.customerPortalUrl };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to open customer portal",
          cause: error,
        });
      }
    }),

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

        const sub = await polarClient.subscriptions.get({
          id: subscriptionId,
        });

        if (sub.status === "trialing") {
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
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to switch plan",
          cause: error,
        });
      }
    }),

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

        return ordersList.map((order) => {
          const metadata = order.metadata as
            | { project?: ProjectType }
            | undefined;
          const project = metadata?.project;
          return {
            ...order,
            project,
          };
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch orders",
          cause: error,
        });
      }
    }),

  getSubscriptions: authenticatedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { userId } = input;

        const rows = await db
          .select({
            subscription: subscriptions,
            productName: products.name,
          })
          .from(subscriptions)
          .leftJoin(products, eq(products.id, subscriptions.productId))
          .where(eq(subscriptions.userId, userId))
          .orderBy(desc(subscriptions.createdAt));

        return rows.map(({ subscription: sub, productName }) => {
          const raw = (sub.metadata as { services?: string } | null | undefined)
            ?.services;
          let services: { name: string; price: number }[] = [];
          if (raw) {
            try {
              services = JSON.parse(raw) as { name: string; price: number }[];
            } catch {
              services = [];
            }
          }
          return { ...sub, productName, services };
        });
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

  listOrders: authenticatedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const ordersList = await db
        .select({
          order: orders,
          productName: products.name,
        })
        .from(orders)
        .leftJoin(products, eq(products.id, orders.productId))
        .where(eq(orders.userId, input.userId))
        .orderBy(desc(orders.createdAt));

      return ordersList.map((r) => ({
        ...r.order,
        productName: r.productName,
      }));
    }),

  verifyCheckout: authenticatedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await polarClient.checkouts.get({ id: input.sessionId });
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Checkout session not found",
        });
      }
    }),

  getCustomerState: authenticatedProcedure.query(async ({ ctx }) => {
    const [subs, paidOrders] = await Promise.all([
      db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.session.user.id)),
      db
        .select()
        .from(orders)
        .where(eq(orders.userId, ctx.session.user.id))
        .then((rows) => rows.filter((o) => o.status === "paid")),
    ]);

    const activeSub = subs.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    return {
      subscriptions: subs,
      activeSubscription: activeSub ?? null,
      paidOrders,
      isUserHaveAccess: !!activeSub || paidOrders.length > 0,
      currentPlan: activeSub?.productId ?? null,
      currentSubscriptionId: activeSub?.id ?? null,
      subscribedProductIds: activeSub ? [activeSub.productId] : [],
    };
  }),

  getPreviousCustomer: authenticatedProcedure.query(async ({ ctx }) => {
    const customer = await db
      .select()
      .from(previousCustomers)
      .where(eq(previousCustomers.email, ctx.session.user.email))
      .limit(1)
      .then((result) => result[0]);
    return customer;
  }),

  // Stripe routes (flat-merged)
  ...stripeRouter._def.procedures,

  // Admin endpoints
  adminListOrders: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const dbRows = await db
        .select({
          order: orders,
          productName: products.name,
        })
        .from(orders)
        .leftJoin(products, eq(products.id, orders.productId))
        .where(eq(orders.userId, input.userId))
        .orderBy(desc(orders.createdAt));

      return dbRows.map((r) => ({
        ...r.order,
        productName: r.productName,
      }));
    }),

  adminGetSubscriptionDetails: adminProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await polarClient.subscriptions.get({
          id: input.subscriptionId,
        });
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }
    }),
});
