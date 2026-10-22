import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { subscriptions } from "@workspace/drizzle/schema";

import { isAdminUser } from "../authz-shared";
import { createHttpError, toTRPCError } from "../cms/errors";
import {
  canUse,
  entitlementFor,
  FEATURES,
  type Entitlement,
  type Feature,
} from "./plans";

// Server side of the plan catalog (./plans): reads each project's
// subscription row (synced by the Stripe webhook on metadata.repoId) and turns
// it into an Entitlement. Every gate and the hub's usePlans hook go through
// here, so "what can this project do" has exactly one answer.

const subscriptionColumns = {
  repoId: subscriptions.repoId,
  status: subscriptions.status,
  priceId: subscriptions.priceId,
  cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
};

/** Entitlements for many projects in one query (missing row = website:free). */
const getEntitlements = async (repoIds: number[]): Promise<Entitlement[]> => {
  if (!repoIds.length) return [];
  const rows = await db
    .select(subscriptionColumns)
    .from(subscriptions)
    .where(inArray(subscriptions.repoId, repoIds));
  const byRepo = new Map(rows.map((row) => [row.repoId, row]));
  return repoIds.map((repoId) => entitlementFor(repoId, byRepo.get(repoId) ?? null));
};

const getEntitlement = async (repoId: number): Promise<Entitlement> => {
  const [row] = await db
    .select(subscriptionColumns)
    .from(subscriptions)
    .where(eq(subscriptions.repoId, repoId))
    .limit(1);
  return entitlementFor(repoId, row ?? null);
};

/**
 * The feature gate for procedures: throws 402 unless the project's tier
 * includes `feature` (admins pass). 402 is reserved for this gate, the hub
 * opens the purchase dialog on it. A DB failure is a 503, so "store is down"
 * never reads as "not subscribed". Thrown as a ready TRPCError because gate
 * calls sit outside the routers' try/toTRPCError blocks.
 */
const requireFeature = async (
  user: { email: string; role?: string | null },
  repoId: number,
  feature: Feature
): Promise<void> => {
  if (isAdminUser(user)) return;

  let entitlement: Entitlement;
  try {
    entitlement = await getEntitlement(repoId);
  } catch (error) {
    console.error(`Plan check failed for repo ${repoId}`, error);
    throw toTRPCError(
      createHttpError("Could not verify this project's plan. Please try again.", 503)
    );
  }

  if (!canUse(entitlement, feature)) {
    throw toTRPCError(
      createHttpError(`${FEATURES[feature]} isn't included in this project's plan.`, 402)
    );
  }
};

export { getEntitlement, getEntitlements, requireFeature };
