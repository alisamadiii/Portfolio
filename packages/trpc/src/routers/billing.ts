import { TRPCError } from "@trpc/server";
import { desc, eq, or } from "drizzle-orm";
import { z } from "zod";

import {
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { stripeClient } from "@workspace/auth/auth";
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
  previousCustomers,
  products,
  subscription,
  user,
} from "@workspace/drizzle/schema";

// ─── Extra-page pricing (amounts in cents) ──────────────────────
const EXTRA_PAGE_TIERS = [
  { pages: 5, pricePerPage: 2500 }, // pages 1–5:   $25/mo each
  { pages: 5, pricePerPage: 4000 }, // pages 6–10:  $40/mo each
  { pages: 5, pricePerPage: 6000 }, // pages 11–15: $60/mo each
] as const;

const MAX_EXTRA_PAGES = EXTRA_PAGE_TIERS.reduce((s, t) => s + t.pages, 0);

function calcExtraPagesCost(extraPages: number): number {
  let remaining = Math.min(extraPages, MAX_EXTRA_PAGES);
  let total = 0;
  for (const tier of EXTRA_PAGE_TIERS) {
    if (remaining <= 0) break;
    const count = Math.min(remaining, tier.pages);
    total += count * tier.pricePerPage;
    remaining -= count;
  }
  return total;
}

export const billingRouter = createTRPCRouter({
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

      // Determine mode based on product's recurring status
      const [product] = await db
        .select({ isRecurring: products.isRecurring })
        .from(products)
        .where(eq(products.priceId, priceIds[0]))
        .limit(1);

      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

      return createCheckoutSession({
        customerId,
        priceIds,
        mode: product?.isRecurring ? "subscription" : "payment",
        successUrl:
          successUrl || `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancelUrl || `${base}/`,
      });
    }),

  createAgencyCheckout: authenticatedProcedure
    .input(
      z.object({
        productId: z.string(),
        successUrl: z.string().optional(),
        extraPages: z.number().int().min(0).default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { productId, successUrl, extraPages } = input;

        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, productId))
          .limit(1);

        if (!product || !product.priceId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product or price not found",
          });
        }

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

        let priceId = product.priceId;

        if (extraPages > 0) {
          const adjustedAmount =
            product.priceAmount + calcExtraPagesCost(extraPages);
          const adHocPrice = await stripeClient.prices.create({
            product: productId,
            unit_amount: adjustedAmount,
            currency: product.priceCurrency,
            recurring: product.isRecurring ? { interval: "month" } : undefined,
            metadata: { extraPages: String(extraPages), adHoc: "true" },
          });
          priceId = adHocPrice.id;
        }

        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/$/,
          ""
        );

        return createCheckoutSession({
          customerId,
          priceIds: [priceId],
          mode: product.isRecurring ? "subscription" : "payment",
          successUrl:
            successUrl ||
            `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${base}/`,
        });
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create checkout",
        });
      }
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

  getPreviousCustomer: authenticatedProcedure.query(async ({ ctx }) => {
    try {
      const customer = await db
        .select()
        .from(previousCustomers)
        .where(eq(previousCustomers.email, ctx.session.user.email))
        .limit(1)
        .then((result) => result[0]);
      return customer;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get previous customers",
        cause: error,
      });
    }
  }),
});
