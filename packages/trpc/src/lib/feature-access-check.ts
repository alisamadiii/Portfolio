import { cacheLife, cacheTag, revalidateTag } from "next/cache";

import { FEATURES, type FeatureKey } from "@workspace/trpc/lib/features";
import { stripe } from "@workspace/trpc/lib/stripe";

export const getStripeCustomerIdsByEmail = async (
  email: string
): Promise<string[]> => {
  "use cache";
  cacheLife("minutes");
  cacheTag("stripe", `stripe-customers-${email}`);
  const customers = await stripe.customers.list({ email, limit: 100 });
  return customers.data.map((c) => c.id);
};

const fetchSubscriptionPriceStatuses = async (customerId: string) => {
  "use cache";
  cacheLife("minutes");
  // Same tag as the full subscription fetch — both derive from subscription
  // state, so they revalidate together.
  cacheTag("stripe", `stripe-subscriptions-${customerId}`);
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
  });
  return subs.data.map((s) => ({
    status: s.status,
    priceIds: s.items.data
      .map((item) => item.price?.id)
      .filter((id): id is string => Boolean(id)),
  }));
};

// past_due keeps access: Stripe is still retrying the card, so the client
// gets a grace period instead of an instant lockout on one failed payment.
const ACCESS_STATUSES = ["active", "trialing", "past_due"];

// Hard expiry ({ expire: 0 }), not stale-while-revalidate: the next read must
// see the new subscription (read-your-own-writes after a purchase), not a
// stale copy served while revalidating in the background.
export const revalidateStripeTagsForCustomer = (
  email: string,
  customerId: string
) => {
  revalidateTag(`stripe-customers-${email}`, { expire: 0 });
  revalidateTag(`stripe-subscriptions-${customerId}`, { expire: 0 });
  revalidateTag(`stripe-invoices-${customerId}`, { expire: 0 });
};

// Server-side feature gate (e.g. CMS save). `fresh: true` bypasses the
// minutes-TTL cache and revalidates it — used right after a purchase so the
// user is never blocked by a stale "no subscription" read.
export async function hasFeatureAccess({
  email,
  feature,
  fresh = false,
}: {
  email: string;
  feature: FeatureKey;
  fresh?: boolean;
}): Promise<{ hasAccess: boolean }> {
  const grantedBy: readonly string[] = FEATURES[feature].grantedBy;

  if (fresh) {
    const customers = await stripe.customers.list({
      email,
      limit: 100,
    });
    let hasAccess = false;
    for (const customer of customers.data) {
      revalidateStripeTagsForCustomer(email, customer.id);
      if (hasAccess) continue;
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 100,
      });
      hasAccess = subs.data.some(
        (sub) =>
          ACCESS_STATUSES.includes(sub.status) &&
          sub.items.data.some(
            (item) => item.price?.id && grantedBy.includes(item.price.id)
          )
      );
    }
    return { hasAccess };
  }

  const customerIds = await getStripeCustomerIdsByEmail(email);
  for (const customerId of customerIds) {
    const subs = await fetchSubscriptionPriceStatuses(customerId);
    const hasAccess = subs.some(
      (sub) =>
        ACCESS_STATUSES.includes(sub.status) &&
        sub.priceIds.some((priceId) => grantedBy.includes(priceId))
    );
    if (hasAccess) return { hasAccess: true };
  }
  return { hasAccess: false };
}
