import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { stripe } from "@workspace/trpc/lib/stripe";
import { db } from "@workspace/drizzle/index";
import {
  orders,
  products,
  subscriptions,
  user,
} from "@workspace/drizzle/schema";

// Syncs the Stripe catalog/billing mirror tables (product / subscription /
// order) from webhook events. Single entry point: syncStripeEvent(event).
//
// State-sync pattern: the event body is only used to learn WHICH object
// changed — every handler re-fetches the current object from the Stripe API
// before writing, so duplicate or out-of-order events (Stripe guarantees
// neither) all converge to the same final state instead of a stale payload
// overwriting newer data.
//
// Per-project CMS subscriptions (metadata.repoId) are NOT handled here — they
// belong to hub_subscription via syncCmsSubscription.

/** Every event type the mirror consumes — subscribe the endpoint to these. */
export const MIRROR_EVENTS = new Set<string>([
  "product.created",
  "product.updated",
  "price.created",
  "price.updated",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "charge.refunded",
]);

const INTERVAL_VALUES = ["day", "week", "month", "year"] as const;
type Interval = (typeof INTERVAL_VALUES)[number];

const toInterval = (value: string | null | undefined): Interval | null =>
  value && INTERVAL_VALUES.includes(value as Interval)
    ? (value as Interval)
    : null;

const productIdOf = (
  product: string | Stripe.Product | Stripe.DeletedProduct | null | undefined
): string | null =>
  product == null ? null : typeof product === "string" ? product : product.id;

/** Resolve our user by Stripe customer id (fallback: metadata.userId). */
const resolveUser = async (
  customerId: string | null,
  metadataUserId: string | null | undefined
): Promise<{ userId: string; email: string } | null> => {
  if (metadataUserId) {
    const [row] = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.id, metadataUserId))
      .limit(1);
    if (row) return { userId: row.id, email: row.email };
  }
  if (customerId) {
    const [row] = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.stripeCustomerId, customerId))
      .limit(1);
    if (row) return { userId: row.id, email: row.email };
  }
  return null;
};

// ─── Products ───────────────────────────────────────────────────

/**
 * Re-fetch a product and its active price from Stripe and upsert the mirror
 * row. Called for product.* and price.* events — order-independent.
 */
const syncStripeProduct = async (productId: string) => {
  const product = await stripe.products.retrieve(productId);

  // Prefer the default price; fall back to the first active one.
  let price: Stripe.Price | null = null;
  if (product.default_price) {
    price =
      typeof product.default_price === "string"
        ? await stripe.prices.retrieve(product.default_price)
        : product.default_price;
  } else {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 1,
    });
    price = prices.data[0] ?? null;
  }

  const values = {
    name: product.name,
    description: product.description ?? null,
    popular: product.metadata.popular === "true",
    priceAmount: price?.unit_amount ?? 0,
    priceCurrency: price?.currency ?? "usd",
    recurringInterval: toInterval(price?.recurring?.interval),
    isRecurring: !!price?.recurring,
    isArchived: !product.active,
    stripePriceId: price?.id ?? null,
    metadata: product.metadata ?? {},
    updatedAt: new Date(),
  };

  await db
    .insert(products)
    .values({
      id: product.id,
      ...values,
      createdAt: new Date(product.created * 1000),
    })
    .onConflictDoUpdate({ target: products.id, set: values });
};

// ─── Subscriptions ──────────────────────────────────────────────

/**
 * Upsert the subscription mirror row from a Stripe subscription. Skips
 * per-project CMS subscriptions (metadata.repoId) — those live in
 * hub_subscription.
 */
const syncStripeSubscription = async (sub: Stripe.Subscription) => {
  if (sub.metadata.repoId || sub.metadata.repo_id) return;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const resolved = await resolveUser(customerId, sub.metadata.userId);

  const item = sub.items.data[0];
  const quantity = item?.quantity ?? 1;

  const values = {
    userId: resolved?.userId ?? sub.metadata.userId ?? "",
    email: resolved?.email ?? sub.metadata.email ?? "",
    amount: (item?.price?.unit_amount ?? 0) * quantity,
    currency: sub.currency,
    productId: productIdOf(item?.price?.product) ?? "",
    status: sub.status,
    updatedAt: new Date(),
    trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : null,
    trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    startedAt: sub.start_date ? new Date(sub.start_date * 1000) : null,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    recurringInterval: toInterval(item?.price?.recurring?.interval),
    metadata: sub.metadata ?? {},
  };

  await db
    .insert(subscriptions)
    .values({
      id: sub.id,
      ...values,
      createdAt: new Date(sub.created * 1000),
    })
    .onConflictDoUpdate({ target: subscriptions.id, set: values });
};

// ─── Orders ─────────────────────────────────────────────────────

/** API v22 nests the invoice's subscription under parent.subscription_details. */
const subscriptionIdOf = (invoice: Stripe.Invoice): string => {
  const sub = invoice.parent?.subscription_details?.subscription;
  return sub == null ? "" : typeof sub === "string" ? sub : sub.id;
};

/**
 * Upsert an order mirror row from a paid Stripe invoice. One-time checkouts
 * create invoices too (invoice_creation is enabled on payment-mode sessions),
 * so every purchase lands here through invoice.paid.
 */
const syncStripeOrderFromInvoice = async (invoice: Stripe.Invoice) => {
  if (!invoice.id) return;
  // Per-project CMS subscription invoices belong to hub_subscription only.
  if (
    invoice.parent?.subscription_details?.metadata?.repoId ||
    invoice.metadata?.repoId
  ) {
    return;
  }

  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer?.id ?? null);
  const subMetadata = invoice.parent?.subscription_details?.metadata ?? {};
  const resolved = await resolveUser(
    customerId,
    subMetadata.userId ?? invoice.metadata?.userId
  );
  const email = resolved?.email ?? invoice.customer_email ?? "";

  const line = invoice.lines?.data?.[0];
  const linePricing = line?.pricing?.price_details;
  const discountAmount = (invoice.total_discount_amounts ?? []).reduce(
    (sum, d) => sum + d.amount,
    0
  );

  // The access gates key on metadata.project. When neither the subscription
  // nor the invoice carries it (payment links, dashboard-created invoices),
  // inherit it from the purchased product's mirror metadata.
  const metadata: Record<string, unknown> = {
    ...subMetadata,
    ...invoice.metadata,
  };
  const productId = linePricing?.product ?? "";
  if (!metadata.project && productId) {
    const [productRow] = await db
      .select({ metadata: products.metadata })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    const project = (productRow?.metadata as { project?: string } | null)
      ?.project;
    if (project) metadata.project = project;
  }

  const values = {
    userId: resolved?.userId ?? "",
    email,
    productId,
    billingName: invoice.customer_name ?? "",
    subscriptionId: subscriptionIdOf(invoice),
    billingReason: invoice.billing_reason ?? "manual",
    totalAmount: invoice.amount_paid,
    invoiceNumber: invoice.number ?? "",
    status: "paid" as const,
    discountAmount,
    updatedAt: new Date(),
    metadata,
  };

  await db
    .insert(orders)
    .values({
      id: invoice.id,
      ...values,
      createdAt: new Date(invoice.created * 1000),
    })
    .onConflictDoUpdate({ target: orders.id, set: values });
};

/** Mark the mirrored order refunded when its charge is refunded. */
const markStripeOrderRefunded = async (charge: Stripe.Charge) => {
  // `invoice` was detached from Charge in newer API versions; read defensively.
  const invoiceRef = (charge as Stripe.Charge & {
    invoice?: string | Stripe.Invoice | null;
  }).invoice;
  const invoiceId =
    invoiceRef == null
      ? null
      : typeof invoiceRef === "string"
        ? invoiceRef
        : invoiceRef.id;
  if (!invoiceId) return;

  await db
    .update(orders)
    .set({
      status: charge.amount_refunded < charge.amount ? "partially_refunded" : "refunded",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, invoiceId));
};

// ─── Dispatcher ─────────────────────────────────────────────────

/**
 * The one entry point the webhook calls for every mirror event. Resolves the
 * changed object's id from the event, re-fetches it fresh from Stripe, and
 * upserts the right mirror table. No-ops on event types it doesn't know.
 */
export const syncStripeEvent = async (event: Stripe.Event) => {
  switch (event.type) {
    case "product.created":
    case "product.updated":
      await syncStripeProduct((event.data.object as Stripe.Product).id);
      break;

    case "price.created":
    case "price.updated": {
      const price = event.data.object as Stripe.Price;
      await syncStripeProduct(productIdOf(price.product)!);
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // Deleted subscriptions remain retrievable (status: canceled).
      const fresh = await stripe.subscriptions.retrieve(
        (event.data.object as Stripe.Subscription).id
      );
      await syncStripeSubscription(fresh);
      break;
    }

    case "invoice.paid": {
      const id = (event.data.object as Stripe.Invoice).id;
      if (id) {
        const fresh = await stripe.invoices.retrieve(id);
        await syncStripeOrderFromInvoice(fresh);
      }
      break;
    }

    case "charge.refunded": {
      const fresh = await stripe.charges.retrieve(
        (event.data.object as Stripe.Charge).id
      );
      await markStripeOrderRefunded(fresh);
      break;
    }
  }
};
