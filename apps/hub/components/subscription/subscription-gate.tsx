"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/contexts/user-context";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";

import { useTRPC } from "@workspace/trpc/client";
import { FEATURES, type FeatureKey } from "@workspace/trpc/lib/features";

import { SUBSCRIPTION_REQUIRED_EVENT } from "@/lib/trpc-errors";
import { PlanCard } from "@/components/billing/plan-card";

/**
 * App-wide purchase dialog for subscription-gated features. Any mutation that
 * comes back PAYMENT_REQUIRED (dispatched by handleCmsError) opens it — no per-surface
 * wiring. After checkout, Stripe returns the user to the page they were on
 * with ?purchase=success, which triggers a fresh access check automatically.
 */
export function SubscriptionGateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const trpc = useTRPC();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<FeatureKey>("cms");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const verifiedOnReturnRef = useRef(false);

  // The plan is per-project: every 402 fires from inside /p/[repoId], so the
  // current path identifies which project the checkout must bind to (the
  // webhook keys the subscription on metadata.repoId).
  const repoIdMatch = pathname?.match(/^\/p\/(\d+)(?:\/|$)/);
  const repoId = repoIdMatch ? Number(repoIdMatch[1]) : undefined;

  const verifyMutation = useMutation(
    trpc.cms.subscription.refresh.mutationOptions({
      onSuccess: (result) => {
        if (result.hasAccess) {
          toast.success("Subscription active — you're all set. Save again.");
          setOpen(false);
        } else {
          toast.error(
            `No active subscription found for ${user?.email ?? "your account"} yet.`
          );
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to verify subscription.");
      },
    })
  );
  const isVerifying = verifyMutation.isPending;
  const verifyAccess = verifyMutation.mutate;

  useEffect(() => {
    const handleRequired = (event: Event) => {
      const detail = (event as CustomEvent<{ feature?: FeatureKey }>).detail;
      if (detail?.feature && detail.feature in FEATURES) {
        setFeature(detail.feature);
      }
      setOpen(true);
    };
    window.addEventListener(SUBSCRIPTION_REQUIRED_EVENT, handleRequired);
    return () =>
      window.removeEventListener(SUBSCRIPTION_REQUIRED_EVENT, handleRequired);
  }, []);

  // Back from Stripe checkout: bust the backend's cached Stripe data so the
  // next save sees the new subscription, then clean the URL.
  useEffect(() => {
    if (verifiedOnReturnRef.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("purchase") !== "success") return;
    verifiedOnReturnRef.current = true;
    url.searchParams.delete("purchase");
    window.history.replaceState(null, "", url.toString());
    verifyAccess({ feature: "cms", repoId });
  }, [verifyAccess, repoId]);

  const handleSubscribe = async () => {
    if (!user?.email) {
      toast.error("Sign in with your email before subscribing.");
      return;
    }
    setIsCheckingOut(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/agency/checkouts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: feature,
            email: user.email,
            name: user.name ?? undefined,
            repoId,
            userId: user.id,
            returnUrl: window.location.href,
          }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Failed to start checkout.");
      }
      window.location.assign(payload.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout."
      );
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Subscribe to unlock</AlertDialogTitle>
            <AlertDialogDescription>
              This project needs an active plan for publishing, AI editing,
              emails, and analytics. Your edits stay in the editor — subscribe
              and continue where you left off.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <PlanCard
            compact
            isCheckingOut={isCheckingOut}
            onSubscribe={() => void handleSubscribe()}
          />

          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              className="w-full"
              disabled={isVerifying || isCheckingOut}
              onClick={() => verifyAccess({ feature, repoId })}
            >
              {isVerifying ? "Checking…" : "I already subscribed"}
            </Button>
            <AlertDialogCancel
              className="w-full"
              disabled={isCheckingOut}
            >
              Not now
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
