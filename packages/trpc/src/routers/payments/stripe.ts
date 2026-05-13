import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { stripe } from "@workspace/trpc/lib/stripe";

export const stripeRouter = createTRPCRouter({
  getStripeSubscriptions: authenticatedProcedure.query(async ({ ctx }) => {
    const stripeCustomerId = ctx.session.user.stripeCustomerId;

    if (!stripeCustomerId) return [];

    const subs = await stripe.subscriptions.list({
      customer: stripeCustomerId,
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
  }),

  getStripeInvoices: authenticatedProcedure.query(async ({ ctx }) => {
    const stripeCustomerId = ctx.session.user.stripeCustomerId;

    if (!stripeCustomerId) return [];

    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 50,
    });

    return invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      amountPaid: inv.amount_paid,
      amountDue: inv.amount_due,
      currency: inv.currency,
      created: inv.created,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      invoicePdf: inv.invoice_pdf,
    }));
  }),

  createStripePortalSession: authenticatedProcedure
    .input(z.object({ returnUrl: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stripeCustomerId = ctx.session.user.stripeCustomerId;

      if (!stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Stripe customer ID found",
        });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: input.returnUrl,
      });

      return { url: session.url };
    }),

  // ─── Admin Stripe Procedures ────────────────────────────────────

  adminGetStripeSubscriptions: adminProcedure
    .input(z.object({ stripeCustomerId: z.string().min(1) }))
    .query(async ({ input }) => {
      const subs = await stripe.subscriptions.list({
        customer: input.stripeCustomerId,
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
    }),

  adminGetStripeInvoices: adminProcedure
    .input(z.object({ stripeCustomerId: z.string().min(1) }))
    .query(async ({ input }) => {
      const invoices = await stripe.invoices.list({
        customer: input.stripeCustomerId,
        limit: 50,
      });

      return invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amountPaid: inv.amount_paid,
        amountDue: inv.amount_due,
        currency: inv.currency,
        created: inv.created,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        invoicePdf: inv.invoice_pdf,
      }));
    }),
});
