export type CreateCustomerInput = {
  email: string;
  name: string;
  metadata?: Record<string, string>;
};

export type CreateCustomerOutput = {
  customerId: string;
};

export type CreateCheckoutInput = {
  customerId: string;
  priceIds: string[];
  mode: "subscription" | "payment";
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

export type CreateCheckoutOutput = {
  url: string;
};

export type CreatePortalSessionInput = {
  customerId: string;
  returnUrl: string;
};

export type CreatePortalSessionOutput = {
  url: string;
};

export type RetrieveCheckoutOutput = {
  status: string | null;
  paymentStatus: string;
  customerEmail: string | null;
};

export type SubscriptionItem = {
  id: string;
  productId: string | null;
  productName: string | null;
  priceId: string;
  unitAmount: number;
  currency: string;
  interval: string | null;
  intervalCount: number | null;
  quantity: number;
};

export type ScheduledPlanChange = {
  newPriceId: string;
  newProductName: string | null;
  effectiveDate: number;
};

export type SubscriptionDetails = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
  canceledAt: number | null;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  items: SubscriptionItem[];
  scheduledChange: ScheduledPlanChange | null;
};

export type SwitchPlanInput = {
  subscriptionId: string;
  newPriceId: string;
  immediate?: boolean;
};

export type SwitchPlanOutput = {
  subscriptionId: string;
  status: string;
};

export type PromotionCode = {
  id: string;
  code: string;
  active: boolean;
  expiresAt: number | null;
  timesRedeemed: number;
  maxRedemptions: number | null;
  coupon: {
    id: string;
    percentOff: number | null;
    amountOff: number | null;
    currency: string | null;
  };
};
