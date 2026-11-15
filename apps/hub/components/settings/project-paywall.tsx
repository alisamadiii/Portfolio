"use client";

import { useProject } from "@/hooks/use-project";

import { Spinner } from "@workspace/ui/components/spinner";

import { FEATURES, type Feature } from "@workspace/trpc/lib/payment/plans";

import { useEntitlement } from "@/hooks/use-plans";

import { PlanOfferPanel } from "@/components/billing/plan-offer-panel";
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
  feedback: {
    title: "Get more 5-star Google reviews",
    body: "Send customers one review link. Happy customers go to Google, the rest tell you privately.",
  },
};

/**
 * Lock screen for a feature the project's plan doesn't include. Shown instead
 * of the panel content; the server gates the underlying procedures with the
 * same catalog (requireFeature).
 */
export const ProjectPaywall = ({
  projectId,
  feature,
}: {
  projectId: string;
  feature: Feature;
}) => {
  const pitch = PITCH[feature];

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-10">
      <span className="inline-flex h-[22px] items-center gap-1.5 rounded bg-coral-soft px-2 text-xs font-medium text-coral-deep">
        <LockKeyhole className="size-3.5" />
        {FEATURES[feature]} · Monthly plan
      </span>
      <h2 className="mt-4 text-center text-[26px] font-semibold leading-tight tracking-[-0.02em] text-balance">
        {pitch.title}
      </h2>
      <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-dim text-pretty">
        {pitch.body}
      </p>

      <div className="mt-8 w-full max-w-md">
        <PlanOfferPanel projectId={projectId} />
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
  const projectId = project?.projectId ?? undefined;
  const { can, isLoading } = useEntitlement(projectId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="text-muted-foreground size-6" />
      </div>
    );
  }
  if (projectId && !can(feature)) {
    return <ProjectPaywall projectId={projectId} feature={feature} />;
  }
  return children;
};
