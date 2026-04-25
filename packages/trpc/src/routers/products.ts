import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { generateDescription } from "@workspace/ui/lib/agency-utils";

import {
  adminProcedure,
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { stripeClient } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import {
  invoices,
  products,
  projectsTypeValues,
  subscription,
} from "@workspace/drizzle/schema";

import { AgencyServiceSchema } from "./types/agency";
import type { AgencyMetadata } from "./types/agency";

// ─── Schemas ─────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string(),
  email: z.string(),
  services: z.array(AgencyServiceSchema),
  userId: z.string(),
  isFree: z.boolean().default(false),
  oneTimePurchase: z.boolean().default(false),
});

// ─── Helpers ─────────────────────────────────────────────────────

function parseAgencyMetadata(product: { metadata: unknown }) {
  const metadata = product.metadata as AgencyMetadata | undefined;
  return {
    userId: metadata?.userId,
    email: metadata?.email,
    services: metadata?.services
      ? (JSON.parse(metadata.services) as { name: string; price: number }[])
      : [],
  };
}

// ─── Router ──────────────────────────────────────────────────────

export const productsRouter = createTRPCRouter({
  // ─── Public ────────────────────────────────────────────────────

  getAll: baseProcedure.query(async () => {
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

  getByProject: baseProcedure
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

  // ─── Authenticated ─────────────────────────────────────────────

  getAgencyProducts: authenticatedProcedure.query(async ({ ctx }) => {
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

      return productsList.map((product) => ({
        ...product,
        ...parseAgencyMetadata(product),
      }));
    } catch (error: unknown) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get products",
      });
    }
  }),

  isAgencyActive: authenticatedProcedure
    .input(
      z.object({
        productId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.session.user.id;

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

  // ─── Admin ─────────────────────────────────────────────────────

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

  create: adminProcedure.input(createSchema).mutation(async ({ input }) => {
    try {
      const { name, email, services, userId, isFree, oneTimePurchase } = input;

      if (!userId || !email || !services) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User ID, email and scope are required",
        });
      }

      const metadata: Record<string, string> = {
        email,
        services: JSON.stringify(services),
        userId,
        project: "AGENCY",
      };

      const totalAmount = services.reduce((sum, s) => sum + s.price, 0);

      const product = await stripeClient.products.create({
        name,
        description: generateDescription(services, oneTimePurchase),
        metadata,
        active: true,
      });

      const price = await stripeClient.prices.create({
        product: product.id,
        unit_amount: isFree ? 0 : totalAmount,
        currency: "usd",
        recurring: oneTimePurchase ? undefined : { interval: "month" },
      });

      await stripeClient.products.update(product.id, {
        default_price: price.id,
      });

      return { ...product, default_price: price.id };
    } catch (error: unknown) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to create product",
        cause: error,
      });
    }
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        oneTimePurchase: z.boolean(),
        email: z.string(),
        services: z.array(AgencyServiceSchema),
        userId: z.string(),
        prorationBehavior: z
          .enum(["always_invoice", "create_prorations", "none"])
          .optional()
          .default("create_prorations"),
        isFree: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const {
          id,
          name,
          oneTimePurchase,
          email,
          services,
          userId,
          prorationBehavior,
          isFree,
        } = input;

        if (!userId || !email || !services) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User ID, email and scope are required",
          });
        }

        const totalAmount = services.reduce((sum, s) => sum + s.price, 0);
        const metadata: Record<string, string> = {
          email,
          services: JSON.stringify(services),
          userId,
          project: "AGENCY",
        };

        const currentProduct = await stripeClient.products.retrieve(id);
        const oldPriceId =
          typeof currentProduct.default_price === "string"
            ? currentProduct.default_price
            : currentProduct.default_price?.id;

        const newPrice = await stripeClient.prices.create({
          product: id,
          unit_amount: isFree ? 0 : totalAmount,
          currency: "usd",
          recurring: oneTimePurchase ? undefined : { interval: "month" },
        });

        const result = await stripeClient.products.update(id, {
          name,
          description: generateDescription(services, oneTimePurchase),
          metadata,
          default_price: newPrice.id,
        });

        if (oldPriceId) {
          await stripeClient.prices.update(oldPriceId, { active: false });
        }

        const [sub] = await db
          .select()
          .from(subscription)
          .where(sql`${subscription.plan} IN (
            SELECT price_id FROM product WHERE id = ${id}
          ) OR ${subscription.stripeSubscriptionId} IN (
            SELECT stripe_subscription_id FROM subscription
            WHERE reference_id = ${userId}
          )`)
          .limit(1);

        if (sub?.stripeSubscriptionId) {
          const stripeSub = await stripeClient.subscriptions.retrieve(
            sub.stripeSubscriptionId
          );
          const itemId = stripeSub.items.data[0]?.id;
          if (itemId) {
            await stripeClient.subscriptions.update(sub.stripeSubscriptionId, {
              items: [{ id: itemId, price: newPrice.id }],
              proration_behavior: prorationBehavior,
            });
          }
        }

        return result;
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to update product",
          cause: error,
        });
      }
    }),

  getAllProducts: adminProcedure.query(async () => {
    try {
      const productsList = await db
        .select()
        .from(products)
        .where(sql`${products.metadata} ? 'userId'`)
        .orderBy(desc(products.createdAt))
        .limit(20);

      return productsList.map((product) => ({
        ...product,
        ...parseAgencyMetadata(product),
      }));
    } catch (error: unknown) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get products",
      });
    }
  }),

  getProductById: adminProcedure.input(z.string()).query(async ({ input }) => {
    try {
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, input))
        .limit(1)
        .then((result) => result[0]);
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return {
        ...product,
        ...parseAgencyMetadata(product),
      };
    } catch (error: unknown) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get product",
      });
    }
  }),

  getProductByUserId: adminProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const productsList = await db
          .select()
          .from(products)
          .where(sql`${products.metadata}->>'userId' = ${input}`)
          .limit(1)
          .then((result) => result[0]);

        return {
          ...productsList,
          ...parseAgencyMetadata(productsList),
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get products by user id",
        });
      }
    }),

  getOrdersByUserId: adminProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const invoicesList = await db
          .select()
          .from(invoices)
          .where(sql`${invoices.metadata}->>'userId' = ${input}`)
          .orderBy(desc(invoices.createdAt))
          .limit(20);

        const subscriptionsList = await db
          .select()
          .from(subscription)
          .where(eq(subscription.referenceId, input))
          .orderBy(desc(subscription.periodStart))
          .limit(20);

        return {
          orders: invoicesList.map((invoice) => ({
            ...invoice,
            ...parseAgencyMetadata(invoice),
          })),
          subscriptions: subscriptionsList.map((sub) => ({
            ...sub,
          })),
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get orders by user id",
        });
      }
    }),

  createCheckout: adminProcedure
    .input(
      z.object({
        productId: z.string(),
      })
    )
    .mutation(async ({ input }): Promise<{ url: string }> => {
      try {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, input.productId));

        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        const metadata = product.metadata as AgencyMetadata | undefined;
        const userId = metadata?.userId;
        const email = metadata?.email;

        if (!product.priceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Product has no price configured",
          });
        }

        const checkout = await stripeClient.checkout.sessions.create({
          mode: product.isRecurring ? "subscription" : "payment",
          line_items: [{ price: product.priceId, quantity: 1 }],
          metadata: {
            userId: userId ?? "",
            productId: input.productId,
            email: email ?? "",
          },
        });

        if (!checkout.url) {
          throw new Error("Failed to create checkout URL");
        }

        return { url: checkout.url };
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
