"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@/contexts/user-context";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";

import { SUBSCRIPTION_REQUIRED_EVENT } from "@/lib/api-client";
import { apiFetch } from "@/lib/query";
import { FEATURES, type FeatureKey } from "@workspace/trpc/lib/features";

/**
 * App-wide purchase dialog for subscription-gated features. Any mutation that
 * comes back 402 (dispatched by requireApiSuccess) opens it — no per-surface
 * wiring. After checkout, Stripe returns the user to the page they were on
 * with ?purchase=success, which triggers a fresh access check automatically.
 */
export function SubscriptionGateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<FeatureKey>("cms");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const verifiedOnReturnRef = useRef(false);

  const verifyMutation = useMutation({
    mutationFn: (featureKey: FeatureKey) =>
      apiFetch<{ data: { hasAccess: boolean } }>(
        `/api/subscription/${featureKey}/refresh`,
        { method: "POST" }
      ),
    onSuccess: (result) => {
      if (result.data.hasAccess) {
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
  });
  const isVerifying = verifyMutation.isPending;
  const verifyAccess = verifyMutation.mutate;

  useEffect(() => {
    const handleRequired = (event: Event) => {
      const detail = (event as CustomEvent<{ feature?: FeatureKey }>).detail;
      if (detail?.feature && detail.feature in FEATURES) {
        setFeature(detail.feature);
        // Survives the round-trip to Stripe so the post-checkout refresh
        // verifies the feature that was actually purchased.
        sessionStorage.setItem("subscription-gate:feature", detail.feature);
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
    const stored = sessionStorage.getItem("subscription-gate:feature");
    verifyAccess(stored && stored in FEATURES ? (stored as FeatureKey) : "cms");
  }, [verifyAccess]);

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

  const featureConfig = FEATURES[feature];

  return (
    <>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {featureConfig.label} subscription required
            </AlertDialogTitle>
            <AlertDialogDescription>
              Saving changes requires an active {featureConfig.label}{" "}
              subscription ({featureConfig.priceLabel}). Your edits stay in the
              editor — subscribe and save again.
              {user?.email ? (
                <>
                  {" "}
                  The subscription must be purchased with{" "}
                  <span className="text-foreground font-medium">
                    {user.email}
                  </span>
                  , the email you&apos;re signed in with.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={isVerifying || isCheckingOut}
              onClick={() => verifyAccess(feature)}
            >
              {isVerifying ? "Checking…" : "I already subscribed"}
            </Button>
            <Button
              disabled={isCheckingOut || isVerifying}
              onClick={() => void handleSubscribe()}
            >
              {isCheckingOut
                ? "Redirecting…"
                : `Subscribe — ${featureConfig.priceLabel}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
