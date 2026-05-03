import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@workspace/drizzle/index";
import {
  orders,
  products,
  subscription,
  user,
} from "@workspace/drizzle/schema";

import { stripeClient } from "./auth";

// ----------------------------
// 📦 Products
// ----------------------------

async function resolvePrice(
  defaultPrice: string | Stripe.Price | null | undefined
): Promise<Stripe.Price | null> {
  if (!defaultPrice) return null;
  if (typeof defaultPrice === "object") return defaultPrice;
  return stripeClient.prices.retrieve(defaultPrice);
}

export const createProduct = async (product: Stripe.Product) => {
  const price = await resolvePrice(product.default_price);
  await db
    .insert(products)
    .values({
      id: product.id,
      name: product.name,
      description: product.description ?? null,
      popular: false,
      priceId: price?.id ?? null,
      priceAmount: price?.unit_amount ?? 0,
      priceCurrency: price?.currency ?? "usd",
      recurringInterval: price?.recurring?.interval ?? null,
      isRecurring: !!price?.recurring,
      isArchived: !product.active,
      metadata: product.metadata ?? {},
      createdAt: new Date(product.created * 1000),
      updatedAt: new Date(product.updated * 1000),
    })
    .onConflictDoNothing();
};

export const updateProduct = async (product: Stripe.Product) => {
  const price = await resolvePrice(product.default_price);
  await db
    .update(products)
    .set({
      name: product.name,
      description: product.description ?? null,
      priceId: price?.id ?? null,
      priceAmount: price?.unit_amount ?? 0,
      priceCurrency: price?.currency ?? "usd",
      recurringInterval: price?.recurring?.interval ?? null,
      isRecurring: !!price?.recurring,
      isArchived: !product.active,
      metadata: product.metadata ?? {},
      updatedAt: new Date(product.updated * 1000),
    })
    .where(eq(products.id, product.id));
};

export const deleteProduct = async (product: Stripe.Product) => {
  await db.delete(products).where(eq(products.id, product.id));
};

// ----------------------------
// 🔄 Subscriptions
// ----------------------------

function buildSubscriptionValues(sub: Stripe.Subscription, userId: string) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const firstItem = sub.items.data[0];

  const totalAmount = sub.items.data.reduce(
    (sum, item) => sum + (item.price.unit_amount ?? 0) * (item.quantity ?? 1),
    0
  );
  const currency = firstItem?.price?.currency ?? "usd";

  return {
    plan: firstItem?.price?.lookup_key ?? firstItem?.price?.id ?? "unknown",
    referenceId: userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    periodStart: firstItem
      ? new Date(firstItem.current_period_start * 1000)
      : null,
    periodEnd: firstItem ? new Date(firstItem.current_period_end * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    endedAt: sub.ended_at ? new Date(sub.ended_at * 1000) : null,
    trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : null,
    trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    seats: firstItem?.quantity ?? null,
    totalAmount,
    currency,
    itemCount: sub.items.data.length,
    billingInterval: firstItem?.price?.recurring?.interval ?? null,
    metadata: sub.metadata ?? {},
  };
}

async function findUserByCustomerId(customerId: string) {
  return db
    .select()
    .from(user)
    .where(eq(user.stripeCustomerId, customerId))
    .limit(1)
    .then((res) => res[0]);
}

export const createSubscription = async (sub: Stripe.Subscription) => {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const dbUser = await findUserByCustomerId(customerId);
  if (!dbUser) return;

  await db
    .insert(subscription)
    .values({ id: sub.id, ...buildSubscriptionValues(sub, dbUser.id) })
    .onConflictDoNothing();
};

export const updateSubscription = async (sub: Stripe.Subscription) => {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const dbUser = await findUserByCustomerId(customerId);
  if (!dbUser) return;

  await db
    .update(subscription)
    .set(buildSubscriptionValues(sub, dbUser.id))
    .where(eq(subscription.stripeSubscriptionId, sub.id));
};

export const deleteSubscription = async (sub: Stripe.Subscription) => {
  await db
    .delete(subscription)
    .where(eq(subscription.stripeSubscriptionId, sub.id));
};

// ----------------------------
// 🛒 One-time Checkout → Orders
// ----------------------------

export const completeCheckout = async (
  session: Stripe.Checkout.Session
) => {
  // Only handle one-time payments — subscriptions already handled separately
  if (session.mode === "subscription") return;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntentId) return;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (!customerId) return;

  const dbUser = await findUserByCustomerId(customerId);

  // Expand line items to get product/price info
  const lineItems = await stripeClient.checkout.sessions.listLineItems(
    session.id,
    { limit: 1 }
  );
  const firstItem = lineItems.data[0];
  const priceId = firstItem?.price?.id ?? null;
  const productId = firstItem?.price?.product
    ? typeof firstItem.price.product === "string"
      ? firstItem.price.product
      : firstItem.price.product.id
    : null;

  // Get receipt URL from the payment intent's latest charge
  let receiptUrl: string | null = null;
  try {
    const pi = await stripeClient.paymentIntents.retrieve(paymentIntentId);
    const chargeId =
      typeof pi.latest_charge === "string"
        ? pi.latest_charge
        : pi.latest_charge?.id;
    if (chargeId) {
      const charge = await stripeClient.charges.retrieve(chargeId);
      receiptUrl = charge.receipt_url ?? null;
    }
  } catch {
    // Receipt URL is non-critical
  }

  await db
    .insert(orders)
    .values({
      id: paymentIntentId,
      userId: dbUser?.id ?? "",
      stripeCustomerId: customerId,
      productId,
      priceId,
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      status: session.payment_status === "paid" ? "paid" : "pending",
      stripeSessionId: session.id,
      receiptUrl,
      metadata: {
        ...(session.metadata as Record<string, unknown> ?? {}),
      },
      createdAt: new Date(session.created * 1000),
    })
    .onConflictDoNothing();
};

export const confirmAsyncPayment = async (
  session: Stripe.Checkout.Session
) => {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntentId) return;

  await db
    .update(orders)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(orders.id, paymentIntentId));
};

export const failAsyncPayment = async (
  session: Stripe.Checkout.Session
) => {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntentId) return;

  await db
    .update(orders)
    .set({ status: "void", updatedAt: new Date() })
    .where(eq(orders.id, paymentIntentId));
};

// ----------------------------
// 💸 Refunds → Orders
// ----------------------------

export const processRefund = async (charge: Stripe.Charge) => {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, paymentIntentId))
    .limit(1)
    .then((r) => r[0]);
  if (!order) return;

  const isFullRefund = charge.amount_refunded >= order.amount;

  await db
    .update(orders)
    .set({
      status: isFullRefund ? "refunded" : "partially_refunded",
      refundedAmount: charge.amount_refunded,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, paymentIntentId));
};

// ----------------------------
// 👤 Customers
// ----------------------------

export const deleteCustomer = async (email: string) => {
  if (!email) throw new Error("Customer email is required");
  await db.delete(user).where(eq(user.email, email));
};
