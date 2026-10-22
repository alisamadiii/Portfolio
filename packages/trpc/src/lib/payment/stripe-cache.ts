import { cacheLife, cacheTag, revalidateTag } from "next/cache";

import { stripe } from "@workspace/trpc/lib/payment/stripe";

export const getStripeCustomerIdsByEmail = async (
  email: string
): Promise<string[]> => {
  "use cache";
  cacheLife("minutes");
  cacheTag("stripe", `stripe-customers-${email}`);
  const customers = await stripe.customers.list({ email, limit: 100 });
  return customers.data.map((c) => c.id);
};

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
