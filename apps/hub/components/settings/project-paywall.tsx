"use client";

import { useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { LockKeyhole } from "@/components/icon";
import { toast } from "sonner";

import { Spinner } from "@workspace/ui/components/spinner";

import { PlanCard } from "@/components/billing/plan-card";
import { FEATURES, type Feature } from "@workspace/trpc/lib/payment/plans";

import { startPlanCheckout, useEntitlement } from "@/hooks/use-plans";

/**
 * Lock screen for a feature the project's plan doesn't include. Shown instead
 * of the panel content; the server gates the underlying procedures with the
 * same catalog (requireFeature).
 */
export const ProjectPaywall = ({
  repoId,
  feature,
}: {
  repoId: number;
  feature: Feature;
}) => {
  const { user } = useUser();
  const label = FEATURES[feature];
  const [checkingOut, setCheckingOut] = useState(false);

  const subscribe = async () => {
    if (!user?.email) {
      toast.error("Sign in with your email before subscribing.");
      return;
    }
    setCheckingOut(true);
    try {
      await startPlanCheckout({
        repoId,
        userId: user.id,
        email: user.email,
        name: user.name,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout."
      );
      setCheckingOut(false);
    }
  };

  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1.5 text-center">
          <p className="flex items-center justify-center gap-2 text-[15px] font-extrabold tracking-tight">
            <LockKeyhole className="size-4" />
            {label} is part of the website plan
          </p>
          <p className="text-muted-foreground text-[14.5px]">
            Subscribe this project to unlock {label.toLowerCase()},
            publishing, and AI editing.
          </p>
        </div>
        <PlanCard
          onSubscribe={() => void subscribe()}
          isCheckingOut={checkingOut}
        />
      </div>
    </div>
  );
};

/**
 * Wraps a feature's panel: the project's plan includes it (or admin) →
 * children; otherwise the paywall. Lives OUTSIDE the panel so the panel's own
 * hooks never run while locked.
 */
export const ProjectFeatureGate = ({
  feature,
  children,
}: {
  feature: Feature;
  children: React.ReactNode;
}) => {
  const { config } = useConfig();
  const repoId = config?.repoId ?? undefined;
  const { can, isLoading } = useEntitlement(repoId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="text-muted-foreground size-6" />
      </div>
    );
  }
  if (repoId && !can(feature)) {
    return <ProjectPaywall repoId={repoId} feature={feature} />;
  }
  return children;
};
