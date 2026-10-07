import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { z } from "zod";

import { resolveRedirectUrl, urls } from "@workspace/ui/lib/company";

import {
  adminProcedure,
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { isAdminUser } from "@workspace/trpc/lib/authz-shared";
import { stripe } from "@workspace/trpc/lib/stripe";
import { db } from "@workspace/drizzle/index";
import {
  orders,
  prices,
  products,
  subscriptions,
  user,
} from "@workspace/drizzle/schema";

import { stripeRouter } from "../stripe/payments";

/**
 * Returns the user's Stripe customer id, creating the customer (and
 * persisting the id on the user row) on first use.
 */
const ensureStripeCustomer = async (sessionUser: {
  id: string;
  email: string;
  name: string;
}): Promise<string> => {
  const [record] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);
  if (record?.stripeCustomerId) {
    // Verify the stored id exists in the CURRENT key's mode — a live id
    // stored while testing (or vice versa) breaks checkout with
    // 'No such customer'. Fall through to create a fresh one if not.
    const valid = await stripe.customers
      .retrieve(record.stripeCustomerId)
      .then((c) => !("deleted" in c && c.deleted))
      .catch(() => false);
    if (valid) return record.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: sessionUser.email,
    name: sessionUser.name,
    metadata: { externalId: sessionUser.id },
  });
  await db
    .update(user)
    .set({ stripeCustomerId: customer.id })
    .where(eq(user.id, sessionUser.id));
  return customer.id;
};

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

  // Active prices of one product, cheapest first — for multi-price products
  // (Lead Finder tiers) whose product mirror only holds the default price.
  getProductPrices: baseProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(prices)
        .where(
          and(eq(prices.productId, input.productId), eq(prices.active, true))
        )
        .orderBy(asc(prices.amount));
    }),

  createCheckout: authenticatedProcedure
    .input(
      z.object({
        productId: z.string(),
        /**
         * Specific tier price for multi-price products; must belong to the
         * product. Omitted → the product's default price.
         */
        priceId: z.string().optional(),
        /** Where the portal success page sends the user once they're done. */
        callbackUrl: z.string().optional(),
        project: z
          .enum(["MOTION", "AGENCY", "DOCS", "TEMPLATE", "SAASKIT", "LEADS"])
          .optional(),
        /** Stripe coupon (or promotion code) id. */
        discountId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }): Promise<{ url: string }> => {
      try {
        const { productId, priceId, callbackUrl, project, discountId } = input;

        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, productId))
          .limit(1);
        let checkoutPriceId = product?.stripePriceId ?? null;
        if (product && priceId) {
          const [priceRow] = await db
            .select({ id: prices.id })
            .from(prices)
            .where(
              and(
                eq(prices.id, priceId),
                eq(prices.productId, product.id),
                eq(prices.active, true)
              )
            )
            .limit(1);
          if (!priceRow) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "That plan is not available",
            });
          }
          checkoutPriceId = priceRow.id;
        }
        if (!product || !checkoutPriceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Product is not available for purchase",
          });
        }

        const customerId = await ensureStripeCustomer(ctx.session.user);

        // Every checkout lands on the hub success page — it is the single
        // source of truth for purchase confirmation across all apps.
        const params = new URLSearchParams();
        params.set("callbackUrl", resolveRedirectUrl(callbackUrl, urls.cms));
        if (project) params.set("project", project);

        // `{CHECKOUT_SESSION_ID}` is a Stripe placeholder and must stay
        // unencoded, so it is appended after URLSearchParams has escaped.
        const base = urls.cms.replace(/\/$/, "");
        const successUrl = `${base}/success?${params.toString()}&session_id={CHECKOUT_SESSION_ID}`;

        const metadata = {
          userId: ctx.session.user.id,
          productId: product.id,
          project: project ?? "",
        };

        const session = await stripe.checkout.sessions.create({
          mode: product.isRecurring ? "subscription" : "payment",
          customer: customerId,
          line_items: [{ price: checkoutPriceId, quantity: 1 }],
          success_url: successUrl,
          cancel_url: resolveRedirectUrl(callbackUrl, urls.cms),
          metadata,
          ...(product.isRecurring
            ? { subscription_data: { metadata } }
            : // One-time purchases still produce an invoice so the webhook
              // mirrors them into the order table via invoice.paid. Session
              // metadata is NOT copied onto that invoice automatically —
              // invoice_data.metadata is what the order sync (and the
              // project-based access gates) read.
              {
                invoice_creation: {
                  enabled: true,
                  invoice_data: { metadata },
                },
              }),
          ...(discountId
            ? {
                discounts: [
                  discountId.startsWith("promo_")
                    ? { promotion_code: discountId }
                    : { coupon: discountId },
                ],
              }
            : {}),
        });
        if (!session.url) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Stripe returned no checkout URL",
          });
        }
        return { url: session.url };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
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

  // Mints the buyer's Stripe billing-portal URL (manage payment methods,
  // cancel subscriptions, download invoices).
  customerPortal: authenticatedProcedure
    .input(z.object({ returnUrl: z.string().optional() }).optional())
    .mutation(async ({ input, ctx }): Promise<{ url: string }> => {
      try {
        const customerId = await ensureStripeCustomer(ctx.session.user);
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: input?.returnUrl ?? urls.cms,
        });
        return { url: session.url };
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
        /** Specific tier price on the target product (multi-price products). */
        toPriceId: z.string().optional(),
        prorationBehavior: z
          .enum(["create_prorations", "always_invoice", "none"])
          .optional()
          .default("create_prorations"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { subscriptionId, toProductId, toPriceId, prorationBehavior } =
          input;

        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, toProductId))
          .limit(1);
        let targetPriceId = product?.stripePriceId ?? null;
        let targetAmount: number | null = null;
        if (product && toPriceId) {
          const [priceRow] = await db
            .select({ id: prices.id, amount: prices.amount })
            .from(prices)
            .where(
              and(
                eq(prices.id, toPriceId),
                eq(prices.productId, product.id),
                eq(prices.active, true)
              )
            )
            .limit(1);
          if (!priceRow) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Target plan is not available",
            });
          }
          targetPriceId = priceRow.id;
          targetAmount = priceRow.amount;
        }
        if (!product || !targetPriceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Target plan is not available",
          });
        }

        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        // Only the subscription's own customer (or an admin) may change it.
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const [owner] = await db
          .select({ stripeCustomerId: user.stripeCustomerId })
          .from(user)
          .where(eq(user.id, ctx.session.user.id))
          .limit(1);
        if (
          !isAdminUser(ctx.session.user) &&
          owner?.stripeCustomerId !== customerId
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subscription not found",
          });
        }

        if (sub.status === "trialing") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot switch plans while subscription is in trial period. Please wait until your trial ends or cancel and start a new subscription.",
          });
        }

        const item = sub.items.data[0];
        if (!item) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Subscription has no items",
          });
        }

        // Tier switches (explicit toPriceId): upgrades apply immediately
        // with an immediate invoice (invoice.paid resets credit balances);
        // downgrades are scheduled for the end of the current period so the
        // user keeps what they paid for until the cycle rolls over.
        const currentAmount = item.price?.unit_amount ?? 0;
        const scheduleRef = (sub as Stripe.Subscription & {
          schedule?: string | Stripe.SubscriptionSchedule | null;
        }).schedule;
        const scheduleId =
          scheduleRef == null
            ? null
            : typeof scheduleRef === "string"
              ? scheduleRef
              : scheduleRef.id;

        if (toPriceId && targetAmount !== null && targetAmount < currentAmount) {
          const schedule = scheduleId
            ? await stripe.subscriptionSchedules.retrieve(scheduleId)
            : await stripe.subscriptionSchedules.create({
                from_subscription: subscriptionId,
              });
          const phaseStart =
            schedule.current_phase?.start_date ??
            schedule.phases[0]?.start_date;
          const phaseEnd =
            schedule.current_phase?.end_date ?? schedule.phases[0]?.end_date;
          await stripe.subscriptionSchedules.update(schedule.id, {
            end_behavior: "release",
            phases: [
              {
                items: [{ price: item.price!.id, quantity: 1 }],
                start_date: phaseStart,
                end_date: phaseEnd,
              },
              { items: [{ price: targetPriceId, quantity: 1 }] },
            ],
          });
          return {
            scheduled: true as const,
            effectiveAt: phaseEnd ? new Date(phaseEnd * 1000) : null,
          };
        }

        // Upgrade (or legacy product switch). A pending downgrade schedule
        // would reject a direct update — release it first.
        if (toPriceId && scheduleId) {
          await stripe.subscriptionSchedules
            .release(scheduleId)
            .catch(() => {});
        }
        await stripe.subscriptions.update(subscriptionId, {
          items: [{ id: item.id, price: targetPriceId }],
          proration_behavior: (toPriceId
            ? "always_invoice"
            : prorationBehavior) as Stripe.SubscriptionUpdateParams.ProrationBehavior,
        });
        return { scheduled: false as const, effectiveAt: null };
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

  getSubscriptions: authenticatedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Non-admins may only read their own subscriptions; admins (user pages)
        // may pass any userId.
        const userId = isAdminUser(ctx.session.user)
          ? input.userId
          : ctx.session.user.id;

        const rows = await db
          .select({
            subscription: subscriptions,
            productName: products.name,
          })
          .from(subscriptions)
          .leftJoin(products, eq(products.id, subscriptions.productId))
          // Product subscriptions only — per-project CMS rows (repoId set)
          // belong to the hub's per-project Billing panel.
          .where(
            and(eq(subscriptions.userId, userId), isNull(subscriptions.repoId))
          )
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
    .query(async ({ input, ctx }) => {
      // Non-admins may only read their own orders; admins may pass any userId.
      const userId = isAdminUser(ctx.session.user)
        ? input.userId
        : ctx.session.user.id;
      const ordersList = await db
        .select({
          order: orders,
          productName: products.name,
        })
        .from(orders)
        .leftJoin(products, eq(products.id, orders.productId))
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt));

      return ordersList.map((r) => ({
        ...r.order,
        productName: r.productName,
      }));
    }),

  getCustomerState: authenticatedProcedure.query(async ({ ctx }) => {
    const [subs, paidOrders] = await Promise.all([
      db
        .select()
        .from(subscriptions)
        // Product subscriptions only — CMS website subs don't grant products.
        .where(
          and(
            eq(subscriptions.userId, ctx.session.user.id),
            isNull(subscriptions.repoId)
          )
        ),
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
        return await stripe.subscriptions.retrieve(input.subscriptionId);
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }
    }),
});
