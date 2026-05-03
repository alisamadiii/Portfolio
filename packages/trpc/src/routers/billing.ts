import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { authenticatedProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { stripeClient } from "@workspace/auth/auth";
import {
  createCheckoutSession,
  createCustomer,
  createPortalSession,
  deleteCustomer,
  getSubscriptionDetails,
  retrieveCheckoutSession,
  switchPlan,
} from "@workspace/auth/payments";
import { db } from "@workspace/drizzle/index";
import {
  orders,
  previousCustomers,
  products,
  subscription,
  user,
} from "@workspace/drizzle/schema";

export const billingRouter = createTRPCRouter({
  getCustomerState: authenticatedProcedure.query(async ({ ctx }) => {
    const [subs, paidOrders] = await Promise.all([
      db
        .select()
        .from(subscription)
        .where(eq(subscription.referenceId, ctx.session.user.id)),
      db
        .select()
        .from(orders)
        .where(eq(orders.userId, ctx.session.user.id))
        .then((rows) =>
          rows.filter(
            (o) => o.status === "paid" || o.status === "partially_refunded"
          )
        ),
    ]);

    const activeSub = subs.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    return {
      subscriptions: subs,
      activeSubscription: activeSub ?? null,
      paidOrders,
      isUserHaveAccess: !!activeSub || paidOrders.length > 0,
      currentPlan: activeSub?.plan ?? null,
      currentSubscriptionId: activeSub?.id ?? null,
    };
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

      // Determine mode and grab product metadata for the checkout session
      const [product] = await db
        .select({
          isRecurring: products.isRecurring,
          metadata: products.metadata,
        })
        .from(products)
        .where(eq(products.priceId, priceIds[0]))
        .limit(1);

      const productMeta =
        product?.metadata && typeof product.metadata === "object"
          ? Object.fromEntries(
              Object.entries(product.metadata as Record<string, unknown>).map(
                ([k, v]) => [k, String(v)]
              )
            )
          : undefined;

      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

      return createCheckoutSession({
        customerId,
        priceIds,
        mode: product?.isRecurring ? "subscription" : "payment",
        metadata: productMeta,
        successUrl: successUrl
          ? `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`
          : `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
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
        immediate: z.boolean().optional(),
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

      if (sub.status === "canceled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot switch a canceled subscription. Please subscribe to a new plan.",
        });
      }

      try {
        return await switchPlan({
          subscriptionId: input.subscriptionId,
          newPriceId: input.newPriceId,
          immediate: input.immediate,
        });
      } catch (err) {
        console.error(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error ? err.message : "Failed to switch plan",
        });
      }
    }),

  getSubscriptionDetails: authenticatedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ input, ctx }) => {
      const sub = await db
        .select()
        .from(subscription)
        .where(eq(subscription.stripeSubscriptionId, input.subscriptionId))
        .limit(1)
        .then((r) => r[0]);

      if (!sub || sub.referenceId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      return getSubscriptionDetails(input.subscriptionId);
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

  listOrders: authenticatedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const dbUser = await db
        .select()
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1)
        .then((r) => r[0]);

      // Get one-time purchase orders from DB
      const dbRows = await db
        .select({
          order: orders,
          productName: products.name,
        })
        .from(orders)
        .leftJoin(products, eq(products.id, orders.productId))
        .where(eq(orders.userId, input.userId))
        .orderBy(desc(orders.createdAt));

      const dbOrders = dbRows.map((r) => ({
        id: r.order.id,
        amount: r.order.amount,
        currency: r.order.currency,
        status: r.order.status,
        productName: r.productName,
        billingReason: r.order.billingReason,
        refundedAmount: r.order.refundedAmount,
        receiptUrl: r.order.receiptUrl,
        metadata: r.order.metadata,
        createdAt: r.order.createdAt,
        type: "one_time" as const,
      }));

      // Get subscription invoices from Stripe SDK
      let invoiceOrders: Array<{
        id: string;
        amount: number;
        currency: string;
        status: string;
        productName: string | null;
        billingReason: string;
        refundedAmount: number;
        receiptUrl: string | null;
        metadata: unknown;
        createdAt: Date | null;
        type: string;
      }> = [];

      if (dbUser?.stripeCustomerId) {
        const stripeInvoices = await stripeClient.invoices.list({
          customer: dbUser.stripeCustomerId,
          limit: 100,
          status: "paid",
        });

        invoiceOrders = stripeInvoices.data.map((inv) => {
          const firstLine = inv.lines?.data?.[0];
          const description = firstLine
            ? (firstLine as { description?: string }).description
            : null;

          return {
            id: inv.id,
            amount: inv.amount_paid,
            currency: inv.currency,
            status: inv.status ?? "paid",
            productName: description ?? null,
            billingReason: inv.billing_reason ?? "subscription",
            refundedAmount: 0,
            receiptUrl: inv.hosted_invoice_url ?? null,
            metadata: {},
            createdAt: new Date(inv.created * 1000),
            type: "subscription" as const,
          };
        });
      }

      // Merge and sort by date descending
      return [...dbOrders, ...invoiceOrders].sort(
        (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
      );
    }),

  deleteCustomer: authenticatedProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const dbUser = await db
        .select()
        .from(user)
        .where(eq(user.id, input))
        .limit(1)
        .then((res) => res[0]);

      if (dbUser?.stripeCustomerId) {
        await deleteCustomer(dbUser.stripeCustomerId);
      }

      if (dbUser?.email) {
        await db.delete(user).where(eq(user.email, dbUser.email));
      }

      return true;
    }),

  getSubscriptions: authenticatedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
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
});
