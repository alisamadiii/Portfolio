import { TRPCError } from "@trpc/server";
import { asc, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import {
  createCheckoutSession,
  createCustomer,
  createPortalSession,
  retrieveCheckoutSession,
  switchPlan,
} from "@workspace/auth/payments";
import { db } from "@workspace/drizzle/index";
import {
  invoices,
  products,
  projectsTypeValues,
  subscription,
  user,
} from "@workspace/drizzle/schema";
import type { ProjectType } from "@workspace/drizzle/schema";

export async function getProductIdByProject(project: ProjectType) {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      sql`${products.metadata}->>'project' = ${project} AND ${products.isArchived} = false`
    )
    .limit(1);
  return product?.id ?? null;
}

export const paymentsRouter = createTRPCRouter({
  getProducts: baseProcedure.query(async () => {
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

  getProductByProject: baseProcedure
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

  updateProduct: adminProcedure
    .input(
      z.object({
        id: z.string(),
        product: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          popular: z.boolean().optional(),
          isArchived: z.boolean().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await db
          .update(products)
          .set(input.product)
          .where(eq(products.id, input.id));
        return result;
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update product",
          cause: error,
        });
      }
    }),

  createCheckout: authenticatedProcedure
    .input(
      z.object({
        priceIds: z.array(z.string()).min(1),
        successUrl: z.string().optional(),
        cancelUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { priceIds, successUrl, cancelUrl } = input;

      const dbUser = await db
        .select()
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1)
        .then((res) => res[0]);

      let customerId = dbUser?.stripeCustomerId;

      if (!customerId) {
        const result = await createCustomer({
          email: ctx.session.user.email,
          name: ctx.session.user.name,
          metadata: { userId: ctx.session.user.id },
        });
        customerId = result.customerId;
        await db
          .update(user)
          .set({ stripeCustomerId: customerId })
          .where(eq(user.id, ctx.session.user.id));
      }

      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

      return createCheckoutSession({
        customerId,
        priceIds,
        mode: "subscription",
        successUrl:
          successUrl || `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancelUrl || `${base}/`,
      });
    }),

  verifyCheckout: authenticatedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await retrieveCheckoutSession(input.sessionId);
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Checkout session not found",
        });
      }
    }),

  switchPlan: authenticatedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        newPriceId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sub = await db
        .select()
        .from(subscription)
        .where(eq(subscription.stripeSubscriptionId, input.subscriptionId))
        .limit(1)
        .then((res) => res[0]);

      if (!sub || sub.referenceId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      try {
        return await switchPlan({
          subscriptionId: input.subscriptionId,
          newPriceId: input.newPriceId,
        });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to switch plan",
        });
      }
    }),

  getCustomerState: authenticatedProcedure.query(async ({ ctx }) => {
    const subs = await db
      .select()
      .from(subscription)
      .where(eq(subscription.referenceId, ctx.session.user.id));

    const activeSub = subs.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    return {
      subscriptions: subs,
      activeSubscription: activeSub ?? null,
      isUserHaveAccess: !!activeSub,
      currentPlan: activeSub?.plan ?? null,
      currentSubscriptionId: activeSub?.id ?? null,
    };
  }),

  createPortalSession: authenticatedProcedure
    .input(z.object({ returnUrl: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const dbUser = await db
        .select()
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1)
        .then((res) => res[0]);

      if (!dbUser?.stripeCustomerId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No Stripe customer found for this user",
        });
      }

      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

      return createPortalSession({
        customerId: dbUser.stripeCustomerId,
        returnUrl: input.returnUrl
          ? `${base}${input.returnUrl}`
          : `${base}/settings`,
      });
    }),

  getInvoices: authenticatedProcedure
    .input(
      z.object({
        userId: z.string(),
        email: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { userId, email } = input;
      return db
        .select()
        .from(invoices)
        .where(or(eq(invoices.userId, userId), eq(invoices.email, email)))
        .orderBy(desc(invoices.createdAt));
    }),

  getSubscriptions: authenticatedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const subs = await db
          .select({
            subscription: subscription,
            productName: products.name,
          })
          .from(subscription)
          .leftJoin(products, eq(products.priceId, subscription.plan))
          .where(eq(subscription.referenceId, input.userId))
          .orderBy(desc(subscription.periodStart));

        return subs.map((s) => ({
          ...s.subscription,
          productName: s.productName,
        }));
      } catch (error: unknown) {
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

export type PaymentsRouter = typeof paymentsRouter;
