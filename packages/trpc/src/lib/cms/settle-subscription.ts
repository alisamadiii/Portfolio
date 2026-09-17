import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubSubscription } from "@workspace/drizzle/schema";

import { stripe } from "@workspace/trpc/lib/stripe";

/**
 * Cancel a project's paid Stripe subscription and refund the unused (prorated)
 * remainder of the current period. Called first in the project-delete flow as a
 * HARD GATE: it deliberately does not swallow Stripe errors, so a failed
 * cancel/refund aborts the whole delete and the project survives for a retry.
 *
 * No-ops (returns quietly) when there's nothing to settle: no subscription row,
 * a non-paid plan, no Stripe subscription id, or an already-canceled sub.
 */
export async function settleAndCancel(repoId: number): Promise<void> {
  const [row] = await db
    .select({
      plan: hubSubscription.plan,
      status: hubSubscription.status,
      stripeSubscriptionId: hubSubscription.stripeSubscriptionId,
    })
    .from(hubSubscription)
    .where(eq(hubSubscription.repoId, repoId))
    .limit(1);

  const subId = row?.stripeSubscriptionId;
  if (!row || row.plan !== "paid" || !subId || row.status === "canceled") {
    return;
  }

  const sub = await stripe.subscriptions.retrieve(subId, {
    expand: ["latest_invoice"],
  });
  if (sub.status === "canceled") return;

  // Period lives on the subscription item in the current Stripe API.
  const item = sub.items.data[0];
  const periodStart = item?.current_period_start ?? sub.created;
  const periodEnd = item?.current_period_end ?? sub.created;

  const invoice =
    sub.latest_invoice && typeof sub.latest_invoice === "object"
      ? sub.latest_invoice
      : null;
  const amountPaid = invoice?.amount_paid ?? 0;

  // Prorate by time remaining in the current period.
  const now = Math.floor(Date.now() / 1000);
  const total = periodEnd - periodStart;
  const remaining = periodEnd - now;
  const refund =
    total > 0 && remaining > 0 && amountPaid > 0
      ? Math.floor((amountPaid * remaining) / total)
      : 0;

  // Cancel immediately (settlement before teardown).
  await stripe.subscriptions.cancel(subId);

  if (refund > 0) {
    // The PaymentIntent that settled the latest invoice — refund target.
    const pi = invoice
      ? ((invoice as unknown as { payment_intent?: string | { id: string } })
          .payment_intent ?? null)
      : null;
    const paymentIntent = typeof pi === "string" ? pi : pi?.id;
    if (paymentIntent) {
      await stripe.refunds.create({ payment_intent: paymentIntent, amount: refund });
    }
  }
}
