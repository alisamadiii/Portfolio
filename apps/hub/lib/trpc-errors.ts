// PAYMENT_REQUIRED is reserved for feature gates (see
// @workspace/trpc/lib/cms/feature-access). Every CMS mutation funnels its
// error through here, so dispatching once opens the purchase dialog
// app-wide without per-surface wiring — the SubscriptionGateProvider
// listens for this event.
const SUBSCRIPTION_REQUIRED_EVENT = "cms:subscription-required";

// Shape-checked rather than instanceof TRPCClientError so hub doesn't need
// a direct @trpc/client dependency.
const isSubscriptionRequired = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { data?: { code?: string } }).data?.code === "PAYMENT_REQUIRED";

/**
 * Normalizes a tRPC mutation error: fires the subscription-gate event on
 * PAYMENT_REQUIRED and returns the message to surface to the user.
 */
const handleCmsError = (error: unknown, fallbackMessage: string): string => {
  if (isSubscriptionRequired(error) && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REQUIRED_EVENT));
  }
  if (error instanceof Error && error.message) return error.message;
  return fallbackMessage;
};

export { handleCmsError, isSubscriptionRequired, SUBSCRIPTION_REQUIRED_EVENT };
