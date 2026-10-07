"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { HandCheck } from "@workspace/ui/icons";
import {
  company,
  resolveAppName,
  resolveRedirectUrl,
} from "@workspace/ui/lib/company";
import { fireCelebration } from "@workspace/ui/lib/confetti";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

// ─── Types ──────────────────────────────────────────────────────

type SuccessProject =
  | "MOTION"
  | "AGENCY"
  | "DOCS"
  | "TEMPLATE"
  | "SAASKIT"
  | "LEADS";

// ─── Helpers ────────────────────────────────────────────────────

const formatAmount = (amount?: number | null, currency?: string | null) => {
  if (amount == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency ?? "usd").toUpperCase(),
  }).format(amount / 100);
};

const getDescription = (
  project: SuccessProject | null,
  productName: string
) => {
  switch (project) {
    case "MOTION":
      return "You now have full access to the animation. Start exploring and use the source code in your own projects.";
    case "AGENCY":
    case "TEMPLATE":
      return "This is where we start building your project. We'll get back to you shortly with a timeline and next steps.";
    case "LEADS":
      return "Your Lead Finder subscription is active and your monthly credits are loaded. Head back and start scanning.";
    default:
      return `${productName} is yours. Everything is unlocked and ready to use.`;
  }
};

// ─── Shell ──────────────────────────────────────────────────────

const SuccessShell = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div className="flex min-h-[60dvh] items-center justify-center">
    <Card className={cn("w-full max-w-lg py-10", className)}>
      <CardContent className="px-8 text-center">{children}</CardContent>
    </Card>
  </div>
);

// ─── Purchase Success ───────────────────────────────────────────

export const PurchaseSuccess = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFiredConfetti = useRef(false);

  const sessionId = searchParams.get("session_id");
  const project = searchParams.get("project") as SuccessProject | null;
  // Validated again on the client — the URL is user-editable.
  const callbackUrl = resolveRedirectUrl(searchParams.get("callbackUrl"));
  const callbackLabel = resolveAppName(callbackUrl);

  const trpc = useTRPC();
  const checkout = useQuery({
    ...trpc.payments.verifyStripeCheckout.queryOptions({
      sessionId: sessionId ?? "",
    }),
    enabled: !!sessionId,
  });

  const paid =
    checkout.data?.status === "complete" &&
    (checkout.data.paymentStatus === "paid" ||
      checkout.data.paymentStatus === "no_payment_required");

  useEffect(() => {
    if (!sessionId) router.replace("/");
  }, [sessionId, router]);

  useEffect(() => {
    if (!paid || hasFiredConfetti.current) return;
    hasFiredConfetti.current = true;

    const timer = setTimeout(fireCelebration, 300);
    return () => clearTimeout(timer);
  }, [paid]);

  const handleContinue = () => {
    // The Next router cannot navigate across origins.
    if (callbackUrl.startsWith("/")) router.push(callbackUrl);
    else window.location.href = callbackUrl;
  };

  if (!sessionId) return null;

  if (checkout.isPending) {
    return (
      <SuccessShell>
        <div className="space-y-6">
          <Skeleton className="mx-auto size-16 rounded-full" />
          <Skeleton className="mx-auto h-8 w-64" />
          <Skeleton className="mx-auto h-4 w-full" />
          <Skeleton className="mx-auto h-4 w-3/4" />
        </div>
      </SuccessShell>
    );
  }

  if (checkout.isError || !paid) {
    return (
      <SuccessShell>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            We couldn&apos;t confirm your purchase
          </h1>
          <p className="text-muted-foreground text-sm">
            {checkout.data?.status === "expired"
              ? "This checkout session expired. Start again to complete your purchase."
              : `If you were charged, email ${company.email} with the checkout ID below and we'll sort it out.`}
          </p>
          <p className="text-muted-foreground font-mono text-xs break-all">
            {sessionId}
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-2">
          <Button size="lg" onClick={handleContinue}>
            {callbackLabel ? `Back to ${callbackLabel}` : "Go back"}
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/" />}>
            Go to dashboard
          </Button>
        </div>
      </SuccessShell>
    );
  }

  const productName = checkout.data?.lineItems?.[0]?.name ?? "Your purchase";
  const amount = formatAmount(
    checkout.data?.amountTotal,
    checkout.data?.currency
  );

  return (
    <SuccessShell>
      <HandCheck className="text-primary mx-auto size-16" />

      <div className="mt-6 space-y-3">
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Payment confirmed{amount ? ` · ${amount}` : ""}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Thank you for your purchase
        </h1>
        <p className="text-muted-foreground text-sm">
          {getDescription(project, productName)}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <Button size="lg" onClick={handleContinue}>
          {callbackLabel ? `Back to ${callbackLabel}` : "Continue"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          render={<Link href="/billing?tab=purchases" />}
        >
          View billing
        </Button>
      </div>

      {checkout.data?.customerEmail && (
        <p className="text-muted-foreground mt-6 font-mono text-xs">
          Receipt sent to {checkout.data.customerEmail}
        </p>
      )}
    </SuccessShell>
  );
};
