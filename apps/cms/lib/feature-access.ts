import "server-only";

import { createInternalCaller } from "@workspace/trpc/http-caller";
import { FEATURES, type FeatureKey } from "@workspace/trpc/lib/features";

import { User } from "@/types/user";

import { hasAdminAccess } from "@/lib/admin";
import { createHttpError } from "@/lib/api-error";

/**
 * Feature gate: throws 402 unless the user has an active subscription that
 * grants the feature (see FEATURES in @workspace/trpc/lib/features). The
 * Stripe lookup runs on the API backend and is cached there for minutes;
 * the post-purchase refresh endpoint busts that cache, so a just-purchased
 * user is never blocked by staleness. 402 is reserved for this gate — the
 * client opens the purchase dialog on any 402.
 */
const requireFeatureAccess = async (
  user: User,
  feature: FeatureKey
): Promise<void> => {
  if (hasAdminAccess(user)) return;
  if (!user.email) {
    throw createHttpError(
      `An active ${FEATURES[feature].label} subscription is required.`,
      402
    );
  }

  let hasAccess: boolean;
  try {
    ({ hasAccess } =
      await createInternalCaller().payments.internalHasFeatureAccess.query({
        email: user.email,
        feature,
      }));
  } catch (error) {
    console.error(`Feature access check failed for "${feature}"`, error);
    // Fail closed, but distinguishable from "no subscription" (503, not 402).
    throw createHttpError(
      "Could not verify your subscription. Please try again.",
      503
    );
  }

  if (!hasAccess) {
    throw createHttpError(
      `An active ${FEATURES[feature].label} subscription is required.`,
      402
    );
  }
};

/**
 * Uncached re-check that also revalidates the backend's cached Stripe data.
 * Called from the refresh endpoint after the user reports a purchase.
 */
const refreshFeatureAccess = async (
  user: User,
  feature: FeatureKey
): Promise<boolean> => {
  if (hasAdminAccess(user)) return true;
  if (!user.email) return false;
  const { hasAccess } =
    await createInternalCaller().payments.internalHasFeatureAccess.query({
      email: user.email,
      feature,
      fresh: true,
    });
  return hasAccess;
};

export { refreshFeatureAccess, requireFeatureAccess };
