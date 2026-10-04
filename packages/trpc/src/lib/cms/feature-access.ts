import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubProject, subscriptions } from "@workspace/drizzle/schema";

import { hasFeatureAccess } from "../feature-access-check";
import { FEATURES, type FeatureKey } from "../features";
import { isAdminUser } from "../authz-shared";
import { createHttpError, toTRPCError } from "./errors";

/**
 * Whether a project (owner/repo) is flagged free-for-life on hubProject — an
 * agency-granted override that bypasses the feature gate for every user. Uses
 * the same case-insensitive owner/repo match as the unique index. Returns false
 * when the repo isn't found (or no owner is given) so callers fall through to
 * the normal gate rather than erroring.
 */
const repoHasFreeLife = async (repo: {
  owner?: string;
  repo: string;
}): Promise<boolean> => {
  const org = repo.owner;
  if (!org) return false;
  const [row] = await db
    .select({ freeLife: hubProject.freeLife })
    .from(hubProject)
    .where(
      and(
        sql`lower(${hubProject.owner}) = lower(${org})`,
        sql`lower(${hubProject.repo}) = lower(${repo.repo})`
      )
    )
    .limit(1);
  return row?.freeLife ?? false;
};

/**
 * Feature gate: throws 402 unless the user has an active subscription that
 * grants the feature (see FEATURES in @workspace/trpc/lib/features). The
 * Stripe lookup runs in-process and is cached for minutes; the post-purchase
 * refresh path revalidates that cache, so a just-purchased user is never
 * blocked by staleness. 402 is reserved for this gate — the client opens the
 * purchase dialog on any 402.
 */
const requireFeatureAccess = async (
  user: { email: string; role?: string | null },
  feature: FeatureKey,
  repo?: { owner?: string; repo: string }
): Promise<void> => {
  if (isAdminUser(user)) return;
  // Free-for-life projects grant access to everyone, regardless of subscription.
  if (repo && (await repoHasFreeLife(repo))) return;
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

/** Subscription statuses that keep a paid project unlocked. */
const ACTIVE_PLAN_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Whether a project's own subscription row unlocks it: an admin-granted
 * free/free_lifetime plan, or a paid plan whose Stripe status is still good.
 */
const projectPlanActive = async (repoId: number): Promise<boolean> => {
  const [row] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.repoId, repoId))
    .limit(1);
  if (!row) return false;
  if (row.plan === "free" || row.plan === "free_lifetime") return true;
  return row.plan === "paid" && ACTIVE_PLAN_STATUSES.has(row.status);
};

/**
 * Per-project plan gate for write/publish procedures. $100/mo buys ONE
 * project, so enforcement reads the project's own subscription row (synced by
 * the Stripe webhook on metadata.repoId) — never a per-email Stripe lookup.
 * Throws 402 (the client opens the purchase dialog on any 402); DB failure is
 * a 503 so "store is down" never reads as "not subscribed".
 *
 * Bypasses: admin user, hubProject.freeLife, free/free_lifetime plan rows.
 */
const requireProjectPlan = async (
  user: { email: string; role?: string | null },
  repoId: number,
  repo?: { owner?: string; repo: string }
): Promise<void> => {
  if (isAdminUser(user)) return;
  if (repo && (await repoHasFreeLife(repo))) return;

  let active: boolean;
  try {
    active = await projectPlanActive(repoId);
  } catch (error) {
    console.error(`Project plan check failed for repo ${repoId}`, error);
    // Thrown as a ready TRPCError: gate call sites sit outside the routers'
    // try/toTRPCError blocks, and a raw Error would surface as
    // INTERNAL_SERVER_ERROR — losing the status code the client keys on.
    throw toTRPCError(
      createHttpError(
        "Could not verify this project's subscription. Please try again.",
        503
      )
    );
  }

  if (!active) {
    // PAYMENT_REQUIRED is what opens the client's purchase dialog.
    throw toTRPCError(
      createHttpError(
        `An active ${FEATURES.cms.label} subscription is required for this project.`,
        402
      )
    );
  }
};

/**
 * Fresh per-project re-check for the post-purchase refresh path — plain DB
 * read, no caching involved.
 */
const refreshProjectPlan = async (
  user: { email: string; role?: string | null },
  repoId: number
): Promise<boolean> => {
  if (isAdminUser(user)) return true;
  return projectPlanActive(repoId);
};

/**
 * Uncached re-check that also revalidates the cached Stripe data.
 * Called from the refresh endpoint after the user reports a purchase.
 */
const refreshFeatureAccess = async (
  user: { email: string; role?: string | null },
  feature: FeatureKey
): Promise<boolean> => {
  if (isAdminUser(user)) return true;
  if (!user.email) return false;
  const { hasAccess } = await hasFeatureAccess({
    email: user.email,
    feature,
    fresh: true,
  });
  return hasAccess;
};

export {
  refreshFeatureAccess,
  refreshProjectPlan,
  requireFeatureAccess,
  requireProjectPlan,
};
