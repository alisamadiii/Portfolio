import { Customer } from "@polar-sh/sdk/models/components/customer.js";
import { Order } from "@polar-sh/sdk/models/components/order.js";
import type { Product } from "@polar-sh/sdk/models/components/product.js";
import { Subscription } from "@polar-sh/sdk/models/components/subscription.js";
import { eq } from "drizzle-orm";

import { polarClient } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import {
  orders,
  products,
  subscriptions,
  user,
} from "@workspace/drizzle/schema";

// ----------------------------
// 📦 Products
// ----------------------------
export const createProduct = async (data: Product) => {
  await db.insert(products).values({
    id: data.id,
    name: data.name,
    description: data.description ?? null,
    popular: false,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    priceAmount: data.prices[0]?.priceAmount || 0,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    priceCurrency: data.prices[0]?.priceCurrency || "usd",
    recurringInterval: data.recurringInterval ?? null,
    isRecurring: data.isRecurring,
    isArchived: false,
    trialInterval: data.trialInterval ?? null,
    trialIntervalCount: data.trialIntervalCount ?? 0,
    metadata: data.metadata ?? {},
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    updatedAt: data.modifiedAt ? new Date(data.modifiedAt) : new Date(),
  });
};

export const updateProduct = async (data: Product) => {
  await db
    .update(products)
    .set({
      name: data.name,
      description: data.description ?? null,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      priceAmount: data.prices[0]?.priceAmount || 0,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      priceCurrency: data.prices[0]?.priceCurrency || "usd",
      recurringInterval: data.recurringInterval ?? null,
      isRecurring: data.isRecurring,
      isArchived: data.isArchived,
      trialInterval: data.trialInterval ?? null,
      trialIntervalCount: data.trialIntervalCount ?? 0,
      metadata: data.metadata ?? {},
      updatedAt: data.modifiedAt ? new Date(data.modifiedAt) : new Date(),
    })
    .where(eq(products.id, data.id));
};
// ----------------------------
// 📦 Products END
// ----------------------------

// ----------------------------
// 🛒 Orders
// ----------------------------
export const createOrder = async (data: Order) => {
  if (!data.customer.externalId)
    throw new Error("Customer external ID is required");

  await db.insert(orders).values({
    id: data.id,
    subscriptionId: data.subscriptionId ?? "",
    email: data.customer.email ?? "",
    userId: data.customer.externalId,
    billingReason: data.billingReason,
    productId: data.productId ?? "",
    billingName: data.billingName ?? "",
    totalAmount: data.totalAmount,
    invoiceNumber: data.invoiceNumber,
    status: data.status,
    discountAmount: data.discountAmount,
    createdAt: data.createdAt,
    updatedAt: data.modifiedAt,
  });
};
export const updateOrder = async (data: Order) => {
  await db
    .update(orders)
    .set({
      subscriptionId: data.subscriptionId ?? "",
      email: data.customer.email,
      userId: data.customer.externalId ?? undefined,
      productId: data.productId ?? "",
      billingName: data.billingName ?? undefined,
      totalAmount: data.totalAmount,
      invoiceNumber: data.invoiceNumber,
      status: data.status,
      discountAmount: data.discountAmount,
      updatedAt: data.modifiedAt,
    })
    .where(eq(orders.id, data.id));
};
export const revokeSubscriptionOnRefund = async (subscriptionId: string) => {
  if (!subscriptionId) throw new Error("Subscription ID is required");

  await polarClient.subscriptions.revoke({
    id: subscriptionId,
  });
};
// ----------------------------
// 🛒 Orders END
// ----------------------------

// ----------------------------
// 👤 Customers
// ----------------------------
export const deleteCustomer = async (data: Customer) => {
  if (!data.email) throw new Error("Customer email is required");

  await db.delete(user).where(eq(user.email, data.email));
};
// ----------------------------
// 👤 Customers END
// ----------------------------

// ----------------------------
// 📅 Subscriptions
// ----------------------------
export const createSubscription = async (data: Subscription) => {
  await db.insert(subscriptions).values({
    id: data.id,
    status: data.status,
    email: data.customer.email ?? "",
    userId: data.customer.externalId ?? "",
    productId: data.productId,
    amount: data.amount,
    currency: data.currency,
    createdAt: data.createdAt,
    updatedAt: data.modifiedAt,
    trialStart: data.trialStart,
    trialEnd: data.trialEnd,
    startedAt: data.startedAt,
    canceledAt: data.canceledAt,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    recurringInterval: data.recurringInterval,
    customerCancellationReason: data.customerCancellationReason,
    customerCancellationComment: data.customerCancellationComment,
    metadata: data.metadata ?? {},
  });
};
export const updateSubscription = async (data: Subscription) => {
  await db
    .update(subscriptions)
    .set({
      status: data.status,
      email: data.customer.email ?? "",
      userId: data.customer.externalId ?? "",
      productId: data.productId,
      amount: data.amount,
      currency: data.currency,
      updatedAt: data.modifiedAt,
      trialStart: data.trialStart,
      trialEnd: data.trialEnd,
      startedAt: data.startedAt,
      canceledAt: data.canceledAt,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      recurringInterval: data.recurringInterval,
      customerCancellationReason: data.customerCancellationReason,
      customerCancellationComment: data.customerCancellationComment,
      metadata: data.metadata ?? {},
    })
    .where(eq(subscriptions.id, data.id));
};
// ----------------------------
// 📅 Subscriptions END
// ----------------------------
