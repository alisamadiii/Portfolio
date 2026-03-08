import { ProductCreate } from "@polar-sh/sdk/models/components/productcreate.js";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { generateDescription } from "@workspace/ui/lib/agency-utils";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { polarClient } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import {
  orders,
  products,
  ProjectType,
  subscriptions,
} from "@workspace/drizzle/schema";

export type AgencyMetadata = {
  userId?: string;
  email?: string;
  services?: string;
  project?: ProjectType;
};

export const AgencyServiceSchema = z.object({
  name: z.string(),
  price: z.number(),
});

const createSchema = z.object({
  name: z.string(),
  email: z.string(),
  services: z.array(AgencyServiceSchema),
  userId: z.string(),
  isFree: z.boolean().default(false),
  oneTimePurchase: z.boolean().default(false),
});

export const adminAgencyProductsRouter = createTRPCRouter({
  create: adminProcedure.input(createSchema).mutation(async ({ input }) => {
    try {
      const { name, email, services, userId, isFree, oneTimePurchase } = input;

      if (!userId || !email || !services) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User ID, email and scope are required",
        });
      }

      // Check if product already exists with the user id in metadata
      const existingProduct = await db
        .select()
        .from(products)
        .where(sql`${products.metadata}->>'userId' = ${userId}`)
        .limit(1);
      if (existingProduct.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Product already exists for this user",
        });
      }

      const metadata: {
        email: string;
        services: string;
        userId: string;
        project: ProjectType;
      } = {
        email,
        services: JSON.stringify(services),
        userId,
        project: "AGENCY",
      };

      const product: ProductCreate = {
        name,
        description: generateDescription(services, oneTimePurchase),
        prices: [
          {
            amountType: isFree ? "free" : "fixed",
            priceAmount: services.reduce((sum, s) => sum + s.price, 0),
          },
        ],
        recurringInterval: oneTimePurchase ? null : "month",
        metadata,
        visibility: "private",
      };

      const result = await polarClient.products.create(product);

      return result;
    } catch (error) {
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
          .enum(["invoice", "prorate"])
          .optional()
          .default("prorate"),
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

        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(sql`${subscriptions.metadata}->>'userId' = ${userId}`)
          .limit(1);

        const result = await polarClient.products.update({
          id,
          productUpdate: {
            name,
            description: generateDescription(services, oneTimePurchase),
            prices: [
              {
                amountType: isFree ? "free" : "fixed",
                priceAmount: services.reduce((sum, s) => sum + s.price, 0),
              },
            ],
          },
        });

        if (subscription) {
          await polarClient.subscriptions.update({
            id: subscription.id,
            subscriptionUpdate: {
              productId: id,
              prorationBehavior,
            },
          });
        }

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create product",
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
    } catch (error) {
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
    } catch (error) {
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

        const metadata = productsList.metadata as AgencyMetadata | undefined;
        const userId = metadata?.userId;
        const email = metadata?.email;
        const services = metadata?.services;

        return {
          ...productsList,
          userId,
          email,
          services: services
            ? (JSON.parse(services) as { name: string; price: number }[])
            : [],
        };
      } catch (error) {
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
        const ordersList = await db
          .select()
          .from(orders)
          .where(sql`${orders.metadata}->>'userId' = ${input}`)
          .orderBy(desc(orders.createdAt))
          .limit(20);

        const subscriptionsList = await db
          .select()
          .from(subscriptions)
          .where(sql`${subscriptions.metadata}->>'userId' = ${input}`)
          .orderBy(desc(subscriptions.createdAt))
          .limit(20);

        return {
          orders: ordersList.map((order) => {
            const metadata = order.metadata as AgencyMetadata | undefined;
            const userId = metadata?.userId;
            const email = metadata?.email;
            const services = metadata?.services;
            return {
              ...order,
              userId,
              email,
              services: services
                ? (JSON.parse(services) as { name: string; price: number }[])
                : [],
            };
          }),
          subscriptions: subscriptionsList.map((subscription) => {
            const metadata = subscription.metadata as
              | AgencyMetadata
              | undefined;
            const userId = metadata?.userId;
            const email = metadata?.email;
            const services = metadata?.services;
            return {
              ...subscription,
              userId,
              email,
              services: services
                ? (JSON.parse(services) as { name: string; price: number }[])
                : [],
            };
          }),
        };
      } catch (error) {
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
    .mutation(async ({ input }) => {
      try {
        const findProduct = await db
          .select()
          .from(products)
          .where(eq(products.id, input.productId));
        if (!findProduct) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }
        const product = findProduct[0];
        const metadata = product.metadata as AgencyMetadata | undefined;
        const userId = metadata?.userId;
        const email = metadata?.email;
        const services = metadata?.services;

        const checkout = await polarClient.checkouts.create({
          products: [input.productId],
          externalCustomerId: userId,
          metadata: {
            userId: userId ?? "",
            productId: input.productId,
            email: email ?? "",
            services: services ?? "",
          },
        });
        return checkout;
      } catch (error) {
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
