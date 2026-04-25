import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@workspace/drizzle/index";
import {
  invoices,
  products,
  subscription,
  user,
} from "@workspace/drizzle/schema";

import { stripeClient } from "./auth";

// ----------------------------
// 📦 Products
// ----------------------------

/**
 * Resolves the default price from a Stripe product.
 * In webhooks, default_price can be a string ID or an expanded Price object.
 */
async function resolvePrice(
  defaultPrice: string | Stripe.Price | null | undefined
): Promise<Stripe.Price | null> {
  if (!defaultPrice) return null;
  if (typeof defaultPrice === "object") return defaultPrice;
  // It's a string ID — fetch the full price from Stripe
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

  // Sum unit_amount × quantity across all subscription items
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
// 🛒 Invoices (from Stripe invoices)
// ----------------------------

export const createInvoice = async (invoice: Stripe.Invoice) => {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  const dbUser = customerId
    ? await db
        .select()
        .from(user)
        .where(eq(user.stripeCustomerId, customerId))
        .limit(1)
        .then((res) => res[0])
    : null;

  await db
    .insert(invoices)
    .values({
      id: invoice.id,
      userId: dbUser?.id ?? "",
      email: invoice.customer_email ?? dbUser?.email ?? "",
      productId:
        invoice.lines?.data?.[0]?.pricing?.price_details?.price?.toString() ??
        null,
      subscriptionId:
        invoice.parent?.subscription_details?.subscription?.toString() ?? null,
      billingName: invoice.customer_name ?? null,
      billingReason: invoice.billing_reason ?? null,
      totalAmount: invoice.amount_paid ?? 0,
      invoiceNumber: invoice.number ?? null,
      status: invoice.status ?? "draft",
      currency: invoice.currency ?? "usd",
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
      createdAt: new Date(invoice.created * 1000),
      updatedAt: new Date(),
      metadata: (invoice.metadata as Record<string, unknown>) ?? {},
    })
    .onConflictDoNothing();
};

export const updateInvoice = async (invoice: Stripe.Invoice) => {
  await db
    .update(invoices)
    .set({
      status: invoice.status ?? "draft",
      totalAmount: invoice.amount_paid ?? 0,
      invoiceNumber: invoice.number ?? null,
      billingName: invoice.customer_name ?? null,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoice.id));
};

// ----------------------------
// 💸 Refunds
// ----------------------------

export const handleChargeRefunded = async (charge: Stripe.Charge) => {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const result = await stripeClient.invoicePayments.list({
    payment: { payment_intent: paymentIntentId, type: "payment_intent" },
    limit: 1,
  });
  const invoicePayment = result.data[0];
  if (!invoicePayment) return;

  const invoiceId =
    typeof invoicePayment.invoice === "string"
      ? invoicePayment.invoice
      : invoicePayment.invoice.id;

  const invoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1)
    .then((r) => r[0]);
  if (!invoice) return;

  const newStatus =
    charge.amount_refunded >= invoice.totalAmount ? "void" : "uncollectible";

  await db
    .update(invoices)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));
};

// ----------------------------
// 👤 Customers
// ----------------------------

export const deleteCustomer = async (email: string) => {
  if (!email) throw new Error("Customer email is required");
  await db.delete(user).where(eq(user.email, email));
};
