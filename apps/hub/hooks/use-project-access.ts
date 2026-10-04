"use client";

import { useUser } from "@/contexts/user-context";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Client-side mirror of the server's requireProjectPlan gate: admin, project
 * freeLife, admin-granted free/free_lifetime rows, or a paid sub whose Stripe
 * status is still good. Drives the Emails/Analytics paywalls — the server
 * enforces the same rule on every gated procedure regardless.
 */
export const useProjectAccess = (repoId: number | undefined) => {
  const { user } = useUser();
  const trpc = useTRPC();

  const query = useQuery({
    ...trpc.cms.subscription.getProject.queryOptions({ repoId: repoId ?? 0 }),
    enabled: !!repoId,
  });

  const isAdmin = user?.role === "admin";
  const sub = query.data?.subscription;
  const hasAccess =
    isAdmin ||
    !!query.data?.freeLife ||
    sub?.plan === "free" ||
    sub?.plan === "free_lifetime" ||
    (sub?.plan === "paid" && ACTIVE_STATUSES.has(sub.status));

  return { hasAccess, isLoading: !!repoId && query.isPending };
};

/** Starts the per-project plan checkout and redirects to Stripe. */
export const startPlanCheckout = async ({
  repoId,
  userId,
  email,
  name,
}: {
  repoId: number;
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
        plan: "cms",
        email,
        name: name || undefined,
        repoId,
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
