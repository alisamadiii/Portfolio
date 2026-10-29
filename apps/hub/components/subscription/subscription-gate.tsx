"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  canUse,
  FEATURES,
  FREE_PLAN,
  type Feature,
} from "@workspace/trpc/lib/payment/plans";

import { SUBSCRIPTION_REQUIRED_EVENT } from "@/lib/trpc-errors";
import { PlanCard } from "@/components/billing/plan-card";
import { startPlanCheckout, usePlans } from "@/hooks/use-plans";

/**
 * App-wide purchase dialog for plan-gated features. Any mutation that comes
 * back PAYMENT_REQUIRED (dispatched by handleCmsError), or a surface that
 * dispatches the event itself with { feature }, opens it: no per-surface
 * wiring. After checkout, Stripe returns the user to the page they were on
 * with ?purchase=success, which triggers a fresh access check automatically.
 */
export function SubscriptionGateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useCurrentUser().data?.user ?? null;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const plans = usePlans();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // The feature that was blocked, when the event says (title + verify check).
  const [feature, setFeature] = useState<Feature | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const verifiedOnReturnRef = useRef(false);

  // The plan is per-project: every 402 fires from inside /p/[projectId], so the
  // current path identifies which project the checkout must bind to (the
  // webhook keys the subscription on metadata.projectId).
  const projectIdMatch = pathname?.match(/^\/p\/([0-9a-f-]{36})(?:\/|$)/i);
  const projectId = projectIdMatch?.[1];

  // Fresh read of this project's plan (the webhook may have just landed),
  // then refresh the cached plans so every gate in the hub updates.
  const verifyMutation = useMutation({
    mutationFn: async ({ projectId, feature }: { projectId?: string; feature: Feature | null }) => {
      if (!projectId) return false;
      const entitlement = await queryClient.fetchQuery({
        ...trpc.plans.project.queryOptions({ projectId }),
        staleTime: 0,
      });
      await plans.refresh();
      return feature ? canUse(entitlement, feature) : entitlement.plan !== FREE_PLAN;
    },
    onSuccess: (hasAccess) => {
      if (hasAccess) {
        toast.success("Subscription active — you're all set.");
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
  });
  const isVerifying = verifyMutation.isPending;
  const verifyAccess = verifyMutation.mutate;

  useEffect(() => {
    const handleRequired = (event: Event) => {
      const detail = (event as CustomEvent<{ feature?: Feature }>).detail;
      setFeature(detail?.feature && detail.feature in FEATURES ? detail.feature : null);
      setOpen(true);
    };
    window.addEventListener(SUBSCRIPTION_REQUIRED_EVENT, handleRequired);
    return () =>
      window.removeEventListener(SUBSCRIPTION_REQUIRED_EVENT, handleRequired);
  }, []);

  // Back from Stripe checkout: re-read the plan so the next action sees the
  // new subscription, then clean the URL.
  useEffect(() => {
    if (verifiedOnReturnRef.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("purchase") !== "success") return;
    verifiedOnReturnRef.current = true;
    url.searchParams.delete("purchase");
    window.history.replaceState(null, "", url.toString());
    verifyAccess({ feature: null, projectId });
  }, [verifyAccess, projectId]);

  const handleSubscribe = async () => {
    if (!user?.email || !projectId) {
      toast.error("Open the project and sign in with your email before subscribing.");
      return;
    }
    setIsCheckingOut(true);
    try {
      await startPlanCheckout({
        projectId,
        userId: user.id,
        email: user.email,
        name: user.name,
      });
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
            <AlertDialogTitle>
              {feature ? `Subscribe to unlock ${FEATURES[feature]}` : "Subscribe to unlock"}
            </AlertDialogTitle>
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
              onClick={() => verifyAccess({ feature, projectId })}
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
