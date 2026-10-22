import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import type Stripe from "stripe";

import { stripe } from "@workspace/trpc/lib/payment/stripe";
import { MIRROR_EVENTS, syncStripeEvent } from "@workspace/trpc/lib/payment/stripe-sync";
import { trackPurchase } from "@workspace/google-analytics/server";
import { db } from "@workspace/drizzle/index";
import { subscriptions, user, webhookEvents } from "@workspace/drizzle/schema";

// Standalone Stripe webhook — the single billing sync point.
//
// Two concerns in ONE subscription table, split by metadata.repoId:
//  1. Per-project CMS subscriptions (metadata.repoId) -> upserted on the
//     repoId partial-unique index via syncCmsSubscription.
//  2. Everything else (Motion/agency/template purchases) -> the product /
//     subscription / order mirror rows via the stripe-sync helpers (keyed on
//     the Stripe sub id).
//
// State-sync pattern: we do NOT trust the event body where ordering matters.
// CMS events funnel to syncCmsSubscription, which re-fetches the event's
// subscription from Stripe and upserts one row per project; product events re-fetch the product + price. This is idempotent
// and order-independent — duplicate or out-of-order events all converge to
// the same final state, sidestepping Stripe's event-ordering pain.
//
// The project<->payment join key is `subscription.metadata.repoId` (set on
// both website checkouts and raw payment links), NEVER email — Stripe emails
// aren't unique and a payment link lets the client pay with any email.

const CMS_EVENTS = new Set<string>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.completed",
  "invoice.paid",
]);

/** Statuses that keep a project unlocked (matches the hub's plan gate). */
const LIVE_STATUSES = new Set<string>(["active", "trialing", "past_due"]);

/** The subscription a CMS event is about, when the event names one. */
function subscriptionIdOf(event: Stripe.Event): string | null {
  const ref = (value: string | { id: string } | null | undefined) =>
    typeof value === "string" ? value : (value?.id ?? null);
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return event.data.object.id;
    case "checkout.session.completed":
      return ref(event.data.object.subscription);
    case "invoice.paid":
      // API v22 nests the invoice's subscription under parent.subscription_details.
      return ref(event.data.object.parent?.subscription_details?.subscription);
    default:
      return null;
  }
}

async function syncCmsSubscription(customerId: string, subscriptionId: string | null) {
  // Sync the subscription the event is about: a customer can hold several
  // (one per project, or a website plan being replaced by an agency plan),
  // and "the newest one" would miss updates to the others.
  const sub = subscriptionId
    ? await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      })
    : (
        await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 1,
          expand: ["data.items.data.price"],
        })
      ).data[0];
  if (!sub) return;

  const repoId = Number(sub.metadata.repoId ?? sub.metadata.repo_id);
  if (!Number.isFinite(repoId) || repoId <= 0) return; // not a CMS project sub

  // One row per project. When a different subscription already holds it:
  // - a live row is never overwritten by a sub that isn't live (e.g. the old
  //   website plan's "deleted" event arriving after the agency plan started);
  // - a new live sub replaces the old live one, which is canceled with a
  //   prorated credit so the client never pays twice for the same project.
  const [current] = await db
    .select({ id: subscriptions.id, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.repoId, repoId))
    .limit(1);
  if (current && current.id !== sub.id && LIVE_STATUSES.has(current.status)) {
    if (!LIVE_STATUSES.has(sub.status)) return;
    if (current.id.startsWith("sub_")) {
      await stripe.subscriptions.cancel(current.id, { prorate: true }).catch((error) => {
        console.error(`Failed to cancel replaced subscription ${current.id}`, error);
      });
    }
  }

  const userId = sub.metadata.userId || null;

  // Reconcile: bind this Stripe customer to the user if not already bound.
  // Covers raw payment-link purchases where the client used any email.
  if (userId) {
    await db
      .update(user)
      .set({ stripeCustomerId: customerId })
      .where(and(eq(user.id, userId), isNull(user.stripeCustomerId)));
  }

  const item = sub.items.data[0];
  const price = item?.price;
  const productId =
    price?.product == null
      ? ""
      : typeof price.product === "string"
        ? price.product
        : price.product.id;
  // API v22 nests current_period_end on the item, not the subscription.
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  const values = {
    // Also set on replacement: the row follows the project's live sub.
    id: sub.id,
    repoId,
    userId: userId ?? "",
    email: sub.metadata.email || "",
    plan: "paid" as const,
    amount: (price?.unit_amount ?? 0) * (item?.quantity ?? 1),
    currency: sub.currency,
    stripeCustomerId: customerId,
    status: sub.status,
    priceId: price?.id ?? null,
    productId,
    recurringInterval: price?.recurring?.interval ?? null,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    updatedAt: new Date(),
  };

  await db
    .insert(subscriptions)
    .values({ ...values, createdAt: new Date(sub.created * 1000) })
    .onConflictDoUpdate({
      // Partial unique index: one CMS row per project.
      target: subscriptions.repoId,
      targetWhere: sql`repo_id is not null`,
      set: values,
    });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Audit log — every received event lands in webhook_events.
  try {
    await db.insert(webhookEvents).values({
      timestamp: new Date(event.created * 1000),
      type: event.type,
      payload: event.data.object,
    });
  } catch (error) {
    console.error("Failed to log Stripe webhook event", error);
  }

  if (!CMS_EVENTS.has(event.type) && !MIRROR_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const object = event.data.object as { customer?: string | Stripe.Customer };
  const customerId =
    typeof object.customer === "string"
      ? object.customer
      : object.customer?.id;

  // GA4 Monetization: fire a discrete purchase per actual payment — NOT from
  // the state-sync below, which re-runs on every subscription update. GA
  // dedupes on transaction_id, so Stripe retries are safe. Fire-and-forget:
  // trackPurchase never throws, and analytics must never 500 the webhook.
  if (event.type === "checkout.session.completed" && customerId) {
    // Covers one-time payments and the first subscription payment.
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid" && session.amount_total != null) {
      const value = session.amount_total / 100;
      void trackPurchase({
        clientId: customerId,
        transactionId: session.id,
        value,
        currency: session.currency ?? "usd",
        items: [
          { item_name: session.metadata?.plan ?? "unknown", price: value, quantity: 1 },
        ],
      });
    }
  } else if (event.type === "invoice.paid" && customerId) {
    // Renewals only — the first invoice (subscription_create) is already
    // counted by checkout.session.completed under a different transaction_id,
    // and one-time checkout invoices (billing_reason "manual") are likewise
    // counted by their checkout.session.completed event.
    const invoice = event.data.object as Stripe.Invoice;
    if (
      invoice.billing_reason !== "subscription_create" &&
      invoice.billing_reason !== "manual"
    ) {
      const value = invoice.amount_paid / 100;
      void trackPurchase({
        clientId: customerId,
        transactionId: invoice.id,
        value,
        currency: invoice.currency,
        items: [
          {
            item_name: invoice.lines.data[0]?.description ?? "subscription renewal",
            price: value,
            quantity: 1,
          },
        ],
      });
    }
  }

  try {
    // Catalog/billing mirror (product / subscription / order tables).
    // One dynamic entry point — the event only identifies WHICH object
    // changed; syncStripeEvent re-fetches it fresh from the Stripe API
    // before writing, so duplicate or out-of-order events (Stripe does not
    // guarantee ordering) always converge to the current state.
    if (MIRROR_EVENTS.has(event.type)) {
      await syncStripeEvent(event);
    }

    // Per-project CMS subscription (hub_subscription).
    if (CMS_EVENTS.has(event.type) && customerId) {
      await syncCmsSubscription(customerId, subscriptionIdOf(event));
    }
  } catch (error) {
    // Return 500 so Stripe retries.
    console.error("Stripe webhook sync failed", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
