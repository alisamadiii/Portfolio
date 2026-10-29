import "server-only";

import { eq, inArray, sql } from "drizzle-orm";

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
// subscription row (synced by the Stripe webhook on metadata.projectId) and turns
// it into an Entitlement. Every gate and the hub's usePlans hook go through
// here, so "what can this project do" has exactly one answer.

// The tenant key is the subscription's metadata, not a column: a sub grants
// access to whatever `metadata.projectId` names (website repo or agency client).
const metaProjectId = sql<string>`${subscriptions.metadata} ->> 'projectId'`;

const subscriptionColumns = {
  projectId: metaProjectId,
  status: subscriptions.status,
  priceId: subscriptions.priceId,
  cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
};

/** Entitlements for many projects in one query (missing row = website:free). */
const getEntitlements = async (projectIds: string[]): Promise<Entitlement[]> => {
  if (!projectIds.length) return [];
  const rows = await db
    .select(subscriptionColumns)
    .from(subscriptions)
    .where(inArray(metaProjectId, projectIds));
  const byProject = new Map(rows.map((row) => [row.projectId, row]));
  return projectIds.map((projectId) =>
    entitlementFor(projectId, byProject.get(projectId) ?? null)
  );
};

const getEntitlement = async (projectId: string): Promise<Entitlement> => {
  const [row] = await db
    .select(subscriptionColumns)
    .from(subscriptions)
    .where(eq(metaProjectId, projectId))
    .limit(1);
  return entitlementFor(projectId, row ?? null);
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
  projectId: string,
  feature: Feature
): Promise<void> => {
  if (isAdminUser(user)) return;

  let entitlement: Entitlement;
  try {
    entitlement = await getEntitlement(projectId);
  } catch (error) {
    console.error(`Plan check failed for repo ${projectId}`, error);
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
