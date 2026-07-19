"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
import { useGeneratePortalLink } from "@workspace/auth/hooks/use-payments";

// ─── Types ──────────────────────────────────────────────────────

type SuccessProject = "MOTION" | "AGENCY" | "DOCS" | "TEMPLATE" | "SAASKIT";

// ─── Helpers ────────────────────────────────────────────────────

/** Polar reports a completed checkout as either of these. */
const PAID_STATUSES = ["succeeded", "confirmed"];

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
    case "SAASKIT":
      return `${productName} is yours. One last step gets you the code — connect GitHub in your Polar portal and the private repo is added to your account.`;
    default:
      return `${productName} is yours. Everything is unlocked and ready to use.`;
  }
};

// ─── Saaskit Guide ──────────────────────────────────────────────

const SAASKIT_STEPS = [
  {
    title: "Open your Polar portal",
    body: "The button below takes you straight to your customer dashboard.",
  },
  {
    title: "Connect your GitHub account",
    body: "Under Benefits, link GitHub — Polar invites you to the private repository automatically.",
  },
  {
    title: "Accept the invite & clone",
    body: "Check your email for the repo invite, then clone, configure .env, and ship.",
  },
];

const SaaskitGuide = () => {
  const generatePortalLink = useGeneratePortalLink();

  return (
    <div className="space-y-6">
      <ol className="space-y-5 text-left">
        {SAASKIT_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs">
              {index + 1}
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-muted-foreground text-sm">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        className="w-full"
        disabled={generatePortalLink.isPending}
        onClick={() => generatePortalLink.mutate()}
      >
        {generatePortalLink.isPending && (
          <Loader2 className="size-4 animate-spin" />
        )}
        Open Polar portal
      </Button>
    </div>
  );
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

  const checkoutId = searchParams.get("checkout_id");
  const project = searchParams.get("project") as SuccessProject | null;
  // Validated again on the client — the URL is user-editable.
  const callbackUrl = resolveRedirectUrl(searchParams.get("callbackUrl"));
  const callbackLabel = resolveAppName(callbackUrl);

  const trpc = useTRPC();
  const checkout = useQuery({
    ...trpc.payments.verifyCheckout.queryOptions({
      sessionId: checkoutId ?? "",
    }),
    enabled: !!checkoutId,
  });

  const paid = !!checkout.data && PAID_STATUSES.includes(checkout.data.status);

  useEffect(() => {
    if (!checkoutId) router.replace("/");
  }, [checkoutId, router]);

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

  if (!checkoutId) return null;

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
            {checkoutId}
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

  const productName = checkout.data?.product?.name ?? "Your purchase";
  const amount = formatAmount(
    checkout.data?.totalAmount,
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

      {project === "SAASKIT" && (
        <div className="mt-8">
          <SaaskitGuide />
        </div>
      )}

      <div className="mt-8 flex flex-col gap-2">
        <Button size="lg" onClick={handleContinue}>
          {callbackLabel ? `Back to ${callbackLabel}` : "Continue"}
        </Button>
        <Button variant="outline" size="lg" render={<Link href="/billing" />}>
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
