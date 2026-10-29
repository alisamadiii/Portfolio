"use client";

import { useCallback, useMemo } from "react";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import { isAdminUser } from "@workspace/trpc/lib/authz-shared";
import {
  canUse,
  entitlementFor,
  type Entitlement,
  type Feature,
  type SelfServePlan,
} from "@workspace/trpc/lib/payment/plans";

/**
 * Every project the user can access, with its plan, features and limits
 * (plans.mine). One cached query for the whole hub: website, agency and any
 * future plan. The server enforces the same catalog with requireFeature, so
 * this only decides what to show.
 */
export const usePlans = () => {
  const user = useCurrentUser().data?.user ?? null;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const query = useQuery(
    trpc.plans.mine.queryOptions(undefined, {
      enabled: Boolean(user),
      staleTime: 5 * 60 * 1000,
    })
  );

  const isAdmin = isAdminUser(user);
  const byRepo = useMemo(
    () => new Map((query.data ?? []).map((e) => [e.projectId, e])),
    [query.data]
  );

  /** A project's entitlement; website:free until loaded or if unknown. */
  const forRepo = useCallback(
    (projectId: string): Entitlement => byRepo.get(projectId) ?? entitlementFor(projectId, null),
    [byRepo]
  );

  const can = useCallback(
    (projectId: string, feature: Feature): boolean =>
      canUse(byRepo.get(projectId), feature, { isAdmin }),
    [byRepo, isAdmin]
  );

  /** Refetch after a purchase or plan change. */
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: trpc.plans.mine.queryKey() }),
    [queryClient, trpc]
  );

  return {
    entitlements: query.data ?? [],
    isLoading: query.isPending,
    isAdmin,
    forRepo,
    can,
    refresh,
  };
};

/** One project's plan, plus a feature check scoped to it. */
export const useEntitlement = (projectId: string | null | undefined) => {
  const plans = usePlans();
  const id = projectId ?? "";
  return {
    entitlement: plans.forRepo(id),
    can: (feature: Feature) => Boolean(projectId) && plans.can(id, feature),
    isLoading: plans.isLoading,
    refresh: plans.refresh,
  };
};

/** Starts a self-serve plan checkout for one project and redirects to Stripe. */
export const startPlanCheckout = async ({
  plan = "website:paid",
  projectId,
  userId,
  email,
  name,
}: {
  plan?: SelfServePlan;
  projectId: string;
  userId: string;
  email: string;
  name?: string | null;
}): Promise<void> => {
  const returnUrl = `${window.location.origin}${window.location.pathname}?purchase=success`;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/agency/checkouts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        email,
        name: name || undefined,
        projectId,
        userId,
        returnUrl,
      }),
    }
  );
  const payload = (await res.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;
  if (!res.ok || !payload?.url) {
    throw new Error(payload?.error || "Failed to start checkout.");
  }
  window.location.assign(payload.url);
};
