import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
  internalProcedure,
} from "@workspace/trpc/init";
import { FEATURES, featureKeys } from "@workspace/trpc/lib/features";
import { stripe } from "@workspace/trpc/lib/stripe";
import { db } from "@workspace/drizzle/index";
import { user } from "@workspace/drizzle/schema";

const getStripeCustomerIdsByEmail = async (
  email: string
): Promise<string[]> => {
  "use cache";
  cacheLife("minutes");
  cacheTag("stripe", `stripe-customers-${email}`);
  const customers = await stripe.customers.list({ email, limit: 100 });
  return customers.data.map((c) => c.id);
};

const getUserEmail = async (userId: string): Promise<string | null> => {
  const [record] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return record?.email ?? null;
};

const getStripeCustomerIdsForUser = async (
  userId: string
): Promise<string[]> => {
  const email = await getUserEmail(userId);
  if (!email) return [];
  return getStripeCustomerIdsByEmail(email);
};

const fetchSubscriptionsForCustomer = async (customerId: string) => {
  "use cache";
  cacheLife("minutes");
  cacheTag("stripe", `stripe-subscriptions-${customerId}`);
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    expand: [
      "data.default_payment_method",
      "data.discounts.source.coupon",
    ],
  });

  // One checkout can bundle several recurring prices into a single Stripe
  // subscription (multiple items.data[]), so emit one card per item rather
  // than collapsing to items.data[0]. The discount is subscription-level, so
  // it rides along on every item.
  const pairs = subs.data.flatMap((sub) =>
    sub.items.data.map((item) => ({ sub, item }))
  );

  return Promise.all(
    pairs.map(async ({ sub, item }) => {
      let productName: string | null = null;

      if (item?.price?.product) {
        const productId =
          typeof item.price.product === "string"
            ? item.price.product
            : item.price.product.id;
        const product = await stripe.products.retrieve(productId);
        productName = product.name;
      }

      // API v22 nests the coupon under discount.source.coupon.
      const coupon = sub.discounts?.reduce<Stripe.Coupon | null>((found, d) => {
        if (found || typeof d !== "object") return found;
        const c = d.source?.coupon;
        return typeof c === "object" ? c : found;
      }, null);

      const quantity = item?.quantity ?? 1;

      return {
        id: item?.id ?? sub.id,
        status: sub.status,
        productName,
        amount: (item?.price?.unit_amount ?? 0) * quantity,
        currency: sub.currency,
        interval: item?.price?.recurring?.interval ?? null,
        currentPeriodEnd: item?.current_period_end ?? sub.created,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at,
        trialEnd: sub.trial_end,
        created: sub.created,
        discount: coupon
          ? {
              name: coupon.name ?? null,
              percentOff: coupon.percent_off ?? null,
              amountOff: coupon.amount_off ?? null,
              currency: coupon.currency ?? null,
              duration: coupon.duration,
              durationInMonths: coupon.duration_in_months ?? null,
            }
          : null,
      };
    })
  );
};

const fetchSubscriptionStatusesForCustomer = async (customerId: string) => {
  "use cache";
  cacheLife("minutes");
  // Same tag as the full subscription fetch — both derive from subscription
  // state, so they revalidate together.
  cacheTag("stripe", `stripe-subscriptions-${customerId}`);
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
  });
  return subs.data.map((s) => ({
    status: s.status,
    cancelAtPeriodEnd: s.cancel_at_period_end,
  }));
};

const fetchSubscriptionPriceStatuses = async (customerId: string) => {
  "use cache";
  cacheLife("minutes");
  // Same tag as the full subscription fetch — both derive from subscription
  // state, so they revalidate together.
  cacheTag("stripe", `stripe-subscriptions-${customerId}`);
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
  });
  return subs.data.map((s) => ({
    status: s.status,
    priceIds: s.items.data
      .map((item) => item.price?.id)
      .filter((id): id is string => Boolean(id)),
  }));
};

// past_due keeps access: Stripe is still retrying the card, so the client
// gets a grace period instead of an instant lockout on one failed payment.
const ACCESS_STATUSES = ["active", "trialing", "past_due"];

// Hard expiry ({ expire: 0 }), not stale-while-revalidate: the next read must
// see the new subscription (read-your-own-writes after a purchase), not a
// stale copy served while revalidating in the background.
const revalidateStripeTagsForCustomer = (email: string, customerId: string) => {
  revalidateTag(`stripe-customers-${email}`, { expire: 0 });
  revalidateTag(`stripe-subscriptions-${customerId}`, { expire: 0 });
  revalidateTag(`stripe-invoices-${customerId}`, { expire: 0 });
};

const fetchInvoicesForCustomer = async (customerId: string) => {
  "use cache";
  cacheLife("minutes");
  cacheTag("stripe", `stripe-invoices-${customerId}`);
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 50,
  });
  return invoices.data;
};

const mapInvoice = (inv: Stripe.Invoice) => ({
  id: inv.id,
  number: inv.number,
  status: inv.status,
  amountPaid: inv.amount_paid,
  amountDue: inv.amount_due,
  currency: inv.currency,
  created: inv.created,
  hostedInvoiceUrl: inv.hosted_invoice_url,
  invoicePdf: inv.invoice_pdf,
  lineItems: (inv.lines?.data ?? []).map((line) => ({
    id: line.id,
    description: line.description,
    amount: line.amount,
    currency: line.currency,
    quantity: line.quantity,
  })),
});

export const stripeRouter = createTRPCRouter({
  // Public: a Checkout Session id (cs_...) is an unguessable bearer token and
  // brand-new agency clients don't have a portal account yet. Returns a
  // minimal hand-picked shape, never the raw session.
  verifyStripeCheckout: baseProcedure
    .input(z.object({ sessionId: z.string().startsWith("cs_").max(200) }))
    .query(async ({ input }) => {
      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.retrieve(input.sessionId, {
          expand: ["line_items"],
        });
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Checkout session not found",
        });
      }

      // A confirmed purchase means the cached Stripe data for this customer
      // is stale — refresh it so billing UIs and feature gates see the new
      // subscription immediately instead of after the cache TTL.
      const paid =
        session.status === "complete" &&
        (session.payment_status === "paid" ||
          session.payment_status === "no_payment_required");
      const sessionEmail =
        session.customer_details?.email ?? session.customer_email;
      if (paid && sessionEmail) {
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        if (customerId) {
          revalidateStripeTagsForCustomer(sessionEmail, customerId);
        } else {
          revalidateTag(`stripe-customers-${sessionEmail}`, { expire: 0 });
        }
      }

      return {
        status: session.status,
        paymentStatus: session.payment_status,
        mode: session.mode,
        currency: session.currency,
        amountSubtotal: session.amount_subtotal,
        amountDiscount: session.total_details?.amount_discount ?? 0,
        amountTotal: session.amount_total,
        customerEmail:
          session.customer_details?.email ?? session.customer_email,
        metadata: {
          plan: session.metadata?.plan ?? null,
          name: session.metadata?.name ?? "",
          company: session.metadata?.company ?? "",
          pages: session.metadata?.pages ?? "",
        },
        lineItems: (session.line_items?.data ?? []).map((li) => ({
          name: li.description,
          quantity: li.quantity,
          amountTotal: li.amount_total,
          // null ⇒ one-time
          interval: li.price?.recurring?.interval ?? null,
        })),
      };
    }),

  // Server-to-server feature gate (e.g. CMS save). `fresh: true` bypasses the
  // minutes-TTL cache and revalidates it — used right after a purchase so the
  // user is never blocked by a stale "no subscription" read.
  internalHasFeatureAccess: internalProcedure
    .input(
      z.object({
        email: z.email(),
        feature: z.enum(featureKeys),
        fresh: z.boolean().default(false),
      })
    )
    .query(async ({ input }): Promise<{ hasAccess: boolean }> => {
      const grantedBy: readonly string[] = FEATURES[input.feature].grantedBy;

      if (input.fresh) {
        const customers = await stripe.customers.list({
          email: input.email,
          limit: 100,
        });
        let hasAccess = false;
        for (const customer of customers.data) {
          revalidateStripeTagsForCustomer(input.email, customer.id);
          if (hasAccess) continue;
          const subs = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 100,
          });
          hasAccess = subs.data.some(
            (sub) =>
              ACCESS_STATUSES.includes(sub.status) &&
              sub.items.data.some(
                (item) => item.price?.id && grantedBy.includes(item.price.id)
              )
          );
        }
        return { hasAccess };
      }

      const customerIds = await getStripeCustomerIdsByEmail(input.email);
      for (const customerId of customerIds) {
        const subs = await fetchSubscriptionPriceStatuses(customerId);
        const hasAccess = subs.some(
          (sub) =>
            ACCESS_STATUSES.includes(sub.status) &&
            sub.priceIds.some((priceId) => grantedBy.includes(priceId))
        );
        if (hasAccess) return { hasAccess: true };
      }
      return { hasAccess: false };
    }),

  getStripeSubscriptions: authenticatedProcedure.query(async ({ ctx }) => {
    const customerIds = await getStripeCustomerIdsForUser(ctx.session.user.id);
    if (customerIds.length === 0) return [];

    const results = await Promise.all(
      customerIds.map(fetchSubscriptionsForCustomer)
    );
    return results.flat();
  }),

  getStripeInvoices: authenticatedProcedure.query(async ({ ctx }) => {
    const customerIds = await getStripeCustomerIdsForUser(ctx.session.user.id);
    if (customerIds.length === 0) return [];

    const results = await Promise.all(
      customerIds.map(async (customerId) => {
        const invoices = await fetchInvoicesForCustomer(customerId);
        return invoices.map(mapInvoice);
      })
    );
    return results.flat();
  }),

  createStripePortalSession: authenticatedProcedure
    .input(z.object({ returnUrl: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const customerIds = await getStripeCustomerIdsForUser(
        ctx.session.user.id
      );

      if (customerIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Stripe customer found",
        });
      }

      // Use first customer (most recent) for portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: customerIds[0],
        return_url: input.returnUrl,
      });

      return { url: session.url };
    }),

  // ─── Admin Stripe Procedures ────────────────────────────────────

  adminGetStripeSubscriptions: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const customerIds = await getStripeCustomerIdsByEmail(input.email);
      if (customerIds.length === 0) return [];

      const results = await Promise.all(
        customerIds.map(fetchSubscriptionsForCustomer)
      );
      return results.flat();
    }),

  adminBatchSubscriptionStatus: adminProcedure
    .input(z.object({ emails: z.array(z.string().email()) }))
    .query(async ({ input }) => {
      const result: Record<string, "active" | "canceling" | "none"> = {};

      await Promise.all(
        input.emails.map(async (email) => {
          try {
            const customerIds = await getStripeCustomerIdsByEmail(email);
            if (customerIds.length === 0) {
              result[email] = "none";
              return;
            }

            const allSubs = await Promise.all(
              customerIds.map(fetchSubscriptionStatusesForCustomer)
            );
            const subs = allSubs.flat();

            const hasActive = subs.some(
              (s) => s.status === "active" && !s.cancelAtPeriodEnd
            );
            const hasCanceling = subs.some(
              (s) => s.status === "active" && s.cancelAtPeriodEnd
            );

            if (hasActive) {
              result[email] = "active";
            } else if (hasCanceling) {
              result[email] = "canceling";
            } else {
              result[email] = "none";
            }
          } catch {
            result[email] = "none";
          }
        })
      );

      return result;
    }),

  adminGetStripeInvoices: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const customerIds = await getStripeCustomerIdsByEmail(input.email);
      if (customerIds.length === 0) return [];

      const results = await Promise.all(
        customerIds.map(async (customerId) => {
          const invoices = await fetchInvoicesForCustomer(customerId);
          return invoices.map(mapInvoice);
        })
      );
      return results.flat();
    }),
});
