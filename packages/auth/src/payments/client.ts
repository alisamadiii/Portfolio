import { stripeClient } from "../auth";

import type {
  CreateCheckoutInput,
  CreateCheckoutOutput,
  CreateCustomerInput,
  CreateCustomerOutput,
  CreatePortalSessionInput,
  CreatePortalSessionOutput,
  PromotionCode,
  RetrieveCheckoutOutput,
  SubscriptionDetails,
  SwitchPlanInput,
  SwitchPlanOutput,
} from "./types";

export async function createCustomer(
  input: CreateCustomerInput
): Promise<CreateCustomerOutput> {
  const customer = await stripeClient.customers.create({
    email: input.email,
    name: input.name,
    metadata: input.metadata,
  });
  return { customerId: customer.id };
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await stripeClient.customers.del(customerId);
}

export async function createCheckoutSession(
  input: CreateCheckoutInput
): Promise<CreateCheckoutOutput> {
  const session = await stripeClient.checkout.sessions.create({
    customer: input.customerId,
    mode: input.mode,
    line_items: input.priceIds.map((id) => ({ price: id, quantity: 1 })),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  return { url: session.url };
}

export async function retrieveCheckoutSession(
  sessionId: string
): Promise<RetrieveCheckoutOutput> {
  const session = await stripeClient.checkout.sessions.retrieve(sessionId);
  return {
    status: session.status,
    paymentStatus: session.payment_status,
    customerEmail: session.customer_details?.email ?? null,
  };
}

export async function createPortalSession(
  input: CreatePortalSessionInput
): Promise<CreatePortalSessionOutput> {
  const session = await stripeClient.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });
  return { url: session.url };
}

export async function getSubscriptionDetails(
  subscriptionId: string
): Promise<SubscriptionDetails> {
  const stripeSub = await stripeClient.subscriptions.retrieve(
    subscriptionId,
    {
      expand: ["items.data.price.product"],
    }
  );

  return {
    id: stripeSub.id,
    status: stripeSub.status,
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    cancelAt: stripeSub.cancel_at,
    canceledAt: stripeSub.canceled_at,
    currentPeriodStart:
      stripeSub.items.data[0]?.current_period_start ?? null,
    currentPeriodEnd: stripeSub.items.data[0]?.current_period_end ?? null,
    items: stripeSub.items.data.map((item) => {
      const product =
        typeof item.price.product === "object" && "name" in item.price.product
          ? item.price.product
          : null;

      return {
        id: item.id,
        productId:
          typeof item.price.product === "string"
            ? item.price.product
            : (product?.id ?? null),
        productName: product?.name ?? null,
        priceId: item.price.id,
        unitAmount: item.price.unit_amount ?? 0,
        currency: item.price.currency,
        interval: item.price.recurring?.interval ?? null,
        intervalCount: item.price.recurring?.interval_count ?? null,
        quantity: item.quantity ?? 1,
      };
    }),
  };
}

export async function switchPlan(
  input: SwitchPlanInput
): Promise<SwitchPlanOutput> {
  const stripeSub = await stripeClient.subscriptions.retrieve(
    input.subscriptionId
  );
  const itemId = stripeSub.items.data[0]?.id;

  if (!itemId) {
    throw new Error("No subscription item found");
  }

  const updated = await stripeClient.subscriptions.update(
    input.subscriptionId,
    {
      items: [{ id: itemId, price: input.newPriceId }],
      proration_behavior: "create_prorations",
    }
  );

  return { subscriptionId: updated.id, status: updated.status };
}

export async function listPromotionCodes(options?: {
  code?: string;
  active?: boolean;
  limit?: number;
}): Promise<PromotionCode[]> {
  const result = await stripeClient.promotionCodes.list({
    ...options,
    expand: ["data.coupon"],
  });

  return result.data.map((pc) => {
    const coupon =
      typeof pc.promotion.coupon === "object" && pc.promotion.coupon
        ? pc.promotion.coupon
        : null;

    return {
      id: pc.id,
      code: pc.code,
      active: pc.active,
      expiresAt: pc.expires_at,
      timesRedeemed: pc.times_redeemed,
      maxRedemptions: pc.max_redemptions,
      coupon: {
        id: coupon?.id ?? "",
        percentOff: coupon?.percent_off ?? null,
        amountOff: coupon?.amount_off ?? null,
        currency: coupon?.currency ?? null,
      },
    };
  });
}
