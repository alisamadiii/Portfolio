import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import type Stripe from "stripe";

import { stripe } from "@workspace/trpc/lib/stripe";
import { db } from "@workspace/drizzle/index";
import { cmsSubscription, user, webhookEvents } from "@workspace/drizzle/schema";

// Standalone Stripe webhook for per-project CMS subscriptions.
//
// State-sync pattern: we do NOT trust the event body. Every relevant event
// funnels to syncCmsSubscription(customerId), which re-fetches the customer's
// current subscription from Stripe and upserts one row per project. This is
// idempotent and order-independent — duplicate or out-of-order events all
// converge to the same final state, sidestepping Stripe's event-ordering pain.
//
// The project<->payment join key is `subscription.metadata.repoId` (set on
// both website checkouts and raw payment links), NEVER email — Stripe emails
// aren't unique and a payment link lets the client pay with any email.

const RELEVANT_EVENTS = new Set<string>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.completed",
  "invoice.paid",
]);

async function syncCmsSubscription(customerId: string) {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
    expand: ["data.items.data.price"],
  });
  const sub = subs.data[0];
  if (!sub) return;

  const repoId = Number(sub.metadata.repoId ?? sub.metadata.repo_id);
  if (!Number.isFinite(repoId) || repoId <= 0) return; // not a CMS project sub

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
      ? null
      : typeof price.product === "string"
        ? price.product
        : price.product.id;
  // API v22 nests current_period_end on the item, not the subscription.
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  await db
    .insert(cmsSubscription)
    .values({
      repoId,
      userId,
      email: sub.metadata.email || null,
      plan: "paid",
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      status: sub.status,
      priceId: price?.id ?? null,
      productId,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: cmsSubscription.repoId,
      set: {
        userId,
        plan: "paid",
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        status: sub.status,
        priceId: price?.id ?? null,
        productId,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        updatedAt: new Date(),
      },
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

  // Audit log, mirroring the Polar webhook's webhookEvents parity.
  try {
    await db.insert(webhookEvents).values({
      timestamp: new Date(event.created * 1000),
      type: event.type,
      payload: event.data.object,
    });
  } catch (error) {
    console.error("Failed to log Stripe webhook event", error);
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const object = event.data.object as { customer?: string | Stripe.Customer };
  const customerId =
    typeof object.customer === "string"
      ? object.customer
      : object.customer?.id;

  if (!customerId) {
    return NextResponse.json({ received: true });
  }

  try {
    await syncCmsSubscription(customerId);
  } catch (error) {
    // Return 500 so Stripe retries.
    console.error("syncCmsSubscription failed", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
