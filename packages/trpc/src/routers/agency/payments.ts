import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { calcExtraPagesCost } from "@workspace/ui/lib/agency-utils";

import {
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { stripeClient } from "@workspace/auth/auth";
import {
  createCheckoutSession,
  createCustomer,
} from "@workspace/auth/payments";
import { db } from "@workspace/drizzle/index";
import {
  invoices,
  products,
  subscription,
  user,
} from "@workspace/drizzle/schema";

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
    } catch (error: unknown) {
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

        // Check for paid invoice
        const [activeInvoice] = await db
          .select({ id: invoices.id })
          .from(invoices)
          .innerJoin(products, eq(invoices.productId, input.productId))
          .where(
            and(
              sql`${invoices.userId} = ${userId}`,
              eq(invoices.status, "paid"),
              sql`${products.metadata}->>'project' = 'AGENCY'`
            )
          )
          .limit(1);

        if (activeInvoice) return true;

        // Check for active subscription
        const [activeSub] = await db
          .select({ id: subscription.id })
          .from(subscription)
          .where(
            and(
              eq(subscription.referenceId, userId),
              eq(subscription.status, "active")
            )
          )
          .limit(1);

        return !!activeSub;
      } catch (error: unknown) {
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
    .mutation(async ({ input, ctx }) => {
      try {
        const { productId, successUrl, extraPages } = input;

        // Look up product to get priceId
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

        // Ensure user has a Stripe customer
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

        // For extra pages, create an ad-hoc price with adjusted amount
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
});
