import "server-only";

import { hasFeatureAccess } from "../feature-access-check";
import { FEATURES, type FeatureKey } from "../features";
import { hasAdminAccess } from "./admin";
import { createHttpError } from "./errors";
import { User } from "./types";

/**
 * Feature gate: throws 402 unless the user has an active subscription that
 * grants the feature (see FEATURES in @workspace/trpc/lib/features). The
 * Stripe lookup runs in-process and is cached for minutes; the post-purchase
 * refresh path revalidates that cache, so a just-purchased user is never
 * blocked by staleness. 402 is reserved for this gate — the client opens the
 * purchase dialog on any 402.
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
    ({ hasAccess } = await hasFeatureAccess({ email: user.email, feature }));
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
 * Uncached re-check that also revalidates the cached Stripe data.
 * Called from the refresh endpoint after the user reports a purchase.
 */
const refreshFeatureAccess = async (
  user: User,
  feature: FeatureKey
): Promise<boolean> => {
  if (hasAdminAccess(user)) return true;
  if (!user.email) return false;
  const { hasAccess } = await hasFeatureAccess({
    email: user.email,
    feature,
    fresh: true,
  });
  return hasAccess;
};

export { refreshFeatureAccess, requireFeatureAccess };
