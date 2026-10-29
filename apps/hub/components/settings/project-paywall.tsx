"use client";

import { useState } from "react";
import { useProject } from "@/hooks/use-project";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { toast } from "sonner";

import { Spinner } from "@workspace/ui/components/spinner";

import { FEATURES, type Feature } from "@workspace/trpc/lib/payment/plans";

import { startPlanCheckout, useEntitlement } from "@/hooks/use-plans";

import { PlanCard } from "@/components/billing/plan-card";
import { LockKeyhole } from "@/components/icon";

// Headline per feature, so the lock screen sells what's behind it.
const PITCH: Record<Feature, { title: string; body: string }> = {
  emails: {
    title: "Email from your own domain",
    body: "Send and track every message your website sends, from an address like hello@yourbusiness.com.",
  },
  analytics: {
    title: "See who visits your website",
    body: "Visitors, top pages and where your traffic comes from, all in one place.",
  },
  speed: {
    title: "Know how fast your website loads",
    body: "Real performance scores with clear fixes, so visitors never wait.",
  },
  "ai-chat": {
    title: "Edit your website by chatting",
    body: "Describe a change, watch it happen on a live preview, then publish in one click.",
  },
  leads: {
    title: "Every lead in one inbox",
    body: "Form and call leads from your website, tracked from first click to closed deal.",
  },
  ads: {
    title: "See what your ads bring in",
    body: "Spend, clicks and leads from Google Ads, side by side.",
  },
  newsletter: {
    title: "Stay in touch with your customers",
    body: "A newsletter that brings past customers back for repeat business.",
  },
};

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
  const user = useCurrentUser().data?.user ?? null;
  const [checkingOut, setCheckingOut] = useState(false);
  const pitch = PITCH[feature];

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
    <div className="mx-auto flex min-h-[80dvh] max-w-xl flex-col items-center px-4 py-14 sm:py-20">
      <span className="bg-card text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold">
        <LockKeyhole className="size-3.5" />
        {FEATURES[feature]} · Website plan
      </span>
      <h2 className="mt-5 text-center text-[30px] leading-[1.1] font-extrabold tracking-tight text-balance sm:text-[36px]">
        {pitch.title}
      </h2>
      <p className="text-muted-foreground mt-3 max-w-md text-center text-[15px] text-pretty">
        {pitch.body}
      </p>

      <div className="mt-9 w-full max-w-md drop-shadow-[0_24px_48px_rgba(224,96,61,0.18)]">
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
  const project = useProject();
  const repoId = project?.repoId ?? undefined;
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
