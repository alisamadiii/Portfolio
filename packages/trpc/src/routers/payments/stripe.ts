import { cacheLife } from "next/cache";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { stripe } from "@workspace/trpc/lib/stripe";
import { db } from "@workspace/drizzle/index";
import { user } from "@workspace/drizzle/schema";

const getStripeCustomerIdsByEmail = async (
  email: string
): Promise<string[]> => {
  "use cache";
  cacheLife("minutes");
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
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    expand: ["data.default_payment_method"],
  });

  return Promise.all(
    subs.data.map(async (sub) => {
      const item = sub.items.data[0];
      let productName: string | null = null;

      if (item?.price?.product) {
        const productId =
          typeof item.price.product === "string"
            ? item.price.product
            : item.price.product.id;
        const product = await stripe.products.retrieve(productId);
        productName = product.name;
      }

      return {
        id: sub.id,
        status: sub.status,
        productName,
        amount: item?.price?.unit_amount ?? 0,
        currency: sub.currency,
        interval: item?.price?.recurring?.interval ?? null,
        currentPeriodEnd: item?.current_period_end ?? sub.created,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at,
        trialEnd: sub.trial_end,
        created: sub.created,
      };
    })
  );
};

const fetchSubscriptionStatusesForCustomer = async (customerId: string) => {
  "use cache";
  cacheLife("minutes");
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
  });
  return subs.data.map((s) => ({
    status: s.status,
    cancelAtPeriodEnd: s.cancel_at_period_end,
  }));
};

const fetchInvoicesForCustomer = async (customerId: string) => {
  "use cache";
  cacheLife("minutes");
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
