import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { stripe } from "@workspace/trpc/lib/stripe";
import { db } from "@workspace/drizzle/index";
import {
  orders,
  prices,
  products,
  subscriptions,
  user,
} from "@workspace/drizzle/schema";

import {
  grantPurchaseCredits,
  resetCreditsToAllowance,
  revokePurchaseCredits,
} from "./credits";

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
    metadata: {
      ...(product.metadata ?? {}),
      // Dashboard-editable feature checklist (Stripe "Marketing features")
      // — rendered by the hub's plan card, so copy edits go live without a
      // deploy.
      features: (product.marketing_features ?? [])
        .map((f) => f.name)
        .filter(Boolean),
    },
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

/**
 * Mirror a single Stripe price. The `product` mirror only keeps the default
 * price, so multi-price products (Lead Finder tiers) read from this table.
 */
const syncStripePrice = async (price: Stripe.Price) => {
  const values = {
    productId: productIdOf(price.product) ?? "",
    amount: price.unit_amount ?? 0,
    currency: price.currency,
    recurringInterval: toInterval(price.recurring?.interval),
    active: price.active,
    metadata: price.metadata ?? {},
    updatedAt: new Date(),
  };
  await db
    .insert(prices)
    .values({
      id: price.id,
      ...values,
      createdAt: new Date(price.created * 1000),
    })
    .onConflictDoUpdate({ target: prices.id, set: values });
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
    // Current tier — multi-price products (Lead Finder) key "current plan"
    // off this.
    priceId: item?.price?.id ?? null,
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
  let productMetadata: { project?: string; credits?: string } | null = null;
  if (productId) {
    const [productRow] = await db
      .select({ metadata: products.metadata })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    productMetadata = (productRow?.metadata ?? null) as {
      project?: string;
      credits?: string;
    } | null;
    if (!metadata.project && productMetadata?.project)
      metadata.project = productMetadata.project;
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

  // Lead-finder billing. Subscription invoices (tier plans) RESET the
  // balance to the tier's allowance every cycle; legacy one-time pack
  // invoices add credits. Both idempotent per invoice id via the ledger's
  // partial unique index.
  if (metadata.project === "LEADS") {
    // Tier allowance lives on the PRICE metadata (one product, many prices).
    // For subscription invoices the SUBSCRIPTION's current price is the
    // truth — upgrade invoices carry proration lines where line[0] can be
    // the OLD price's credit line. Fall back to the invoice line price,
    // then invoice/sub metadata, then the product mirror.
    const subscriptionId = subscriptionIdOf(invoice);
    let priceId: string | null = null;
    if (subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        priceId = sub.items.data[0]?.price?.id ?? null;
      } catch {
        priceId = null;
      }
    }
    if (!priceId) {
      const linePrice = linePricing?.price;
      priceId =
        linePrice == null
          ? null
          : typeof linePrice === "string"
            ? linePrice
            : (linePrice as Stripe.Price).id;
    }
    let priceCredits: string | undefined;
    if (priceId) {
      const [priceRow] = await db
        .select({ metadata: prices.metadata })
        .from(prices)
        .where(eq(prices.id, priceId))
        .limit(1);
      priceCredits = (priceRow?.metadata as { credits?: string } | null)
        ?.credits;
    }
    const credits = Number(
      priceCredits ??
        (metadata.credits as string | undefined) ??
        productMetadata?.credits ??
        0
    );
    if (!resolved?.userId || !Number.isFinite(credits) || credits <= 0) {
      console.error(
        `[stripe-sync] LEADS invoice ${invoice.id}: cannot grant credits (userId=${resolved?.userId}, credits=${credits})`
      );
    } else if (subscriptionId) {
      await resetCreditsToAllowance({
        userId: resolved.userId,
        allowance: credits,
        invoiceId: invoice.id,
      });
    } else {
      await grantPurchaseCredits({
        userId: resolved.userId,
        credits,
        invoiceId: invoice.id,
      });
    }
  }
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

  const [order] = await db
    .update(orders)
    .set({
      status: charge.amount_refunded < charge.amount ? "partially_refunded" : "refunded",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, invoiceId))
    .returning();

  // Fully refunded credit pack → claw the credits back (idempotent; balance
  // may go negative if they were already spent — that's abuse visibility).
  if (
    order &&
    order.status === "refunded" &&
    (order.metadata as { project?: string } | null)?.project === "LEADS" &&
    order.userId
  ) {
    const [productRow] = await db
      .select({ metadata: products.metadata })
      .from(products)
      .where(eq(products.id, order.productId))
      .limit(1);
    const credits = Number(
      (order.metadata as { credits?: string } | null)?.credits ??
        (productRow?.metadata as { credits?: string } | null)?.credits ??
        0
    );
    if (credits > 0) {
      await revokePurchaseCredits({
        userId: order.userId,
        credits,
        invoiceId,
      });
    }
  }
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
      const fresh = await stripe.prices.retrieve(
        (event.data.object as Stripe.Price).id
      );
      await syncStripePrice(fresh);
      await syncStripeProduct(productIdOf(fresh.product)!);
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
