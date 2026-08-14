"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { HandCheck } from "@workspace/ui/icons";
import { company, urls } from "@workspace/ui/lib/company";
import { fireCelebration } from "@workspace/ui/lib/confetti";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

// ─── Helpers ────────────────────────────────────────────────────

const formatAmount = (amount?: number | null, currency?: string | null) => {
  if (amount == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency ?? "usd").toUpperCase(),
  }).format(amount / 100);
};

const EASE = [0.25, 1, 0.5, 1] as const;

const Section = ({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    transition={{ duration: 0.5, ease: EASE, delay }}
  >
    {children}
  </motion.div>
);

// ─── Static content ─────────────────────────────────────────────

const NEXT_STEPS = [
  {
    title: "We reach out",
    body: `Within one business day you'll hear from us at the email you paid with — or write to ${company.agencyEmail} anytime.`,
  },
  {
    title: "Kickoff",
    body: "We confirm scope, pages, and design direction together so the build starts on the right foot.",
  },
  {
    title: "We build, you follow along",
    body: "Track progress, invoices, and requests from your client hub while your site takes shape.",
  },
  {
    title: "Launch & handoff",
    body: "Your site goes live and you get everything you need to run it.",
  },
];

// ─── Agency Welcome ─────────────────────────────────────────────

export const AgencyWelcome = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFiredConfetti = useRef(false);

  const sessionId = searchParams.get("session_id");

  const trpc = useTRPC();
  const checkout = useQuery({
    ...trpc.payments.verifyStripeCheckout.queryOptions({
      sessionId: sessionId ?? "cs_",
    }),
    enabled: !!sessionId,
    retry: false,
  });

  const { data: session } = useCurrentUser();
  const isLoggedIn = !!session?.user;

  const data = checkout.data;
  const paid =
    !!data &&
    data.status === "complete" &&
    (data.paymentStatus === "paid" ||
      data.paymentStatus === "no_payment_required");

  useEffect(() => {
    if (!sessionId) router.replace("/");
  }, [sessionId, router]);

  useEffect(() => {
    if (!paid || hasFiredConfetti.current) return;
    hasFiredConfetti.current = true;

    const timer = setTimeout(fireCelebration, 300);
    return () => clearTimeout(timer);
  }, [paid]);

  if (!sessionId) return null;

  if (checkout.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-16">
        <Skeleton className="mx-auto size-16 rounded-full" />
        <Skeleton className="mx-auto h-9 w-72" />
        <Skeleton className="mx-auto h-4 w-96 max-w-full" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (checkout.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <Card className="w-full max-w-lg py-10">
          <CardContent className="space-y-3 px-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              We couldn&apos;t confirm your purchase
            </h1>
            <p className="text-muted-foreground text-sm">
              If you were charged, email {company.agencyEmail} with the checkout
              ID below and we&apos;ll sort it out.
            </p>
            <p className="text-muted-foreground font-mono text-xs break-all">
              {sessionId}
            </p>
            <div className="pt-5">
              <Button
                size="lg"
                className="rounded-full px-6"
                render={<a href={urls.agency} />}
              >
                Back to the agency site
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paid) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <Card className="w-full max-w-lg py-10">
          <CardContent className="space-y-3 px-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Checkout not completed
            </h1>
            <p className="text-muted-foreground text-sm">
              {data?.status === "expired"
                ? "This checkout session expired. Start again to complete your purchase."
                : "This checkout hasn't been paid yet. Head back to finish it, or start a new one."}
            </p>
            <div className="pt-5">
              <Button
                size="lg"
                className="rounded-full px-6"
                render={<a href={urls.agency} />}
              >
                Back to the agency site
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const total = formatAmount(data.amountTotal, data.currency);
  const subtotal = formatAmount(data.amountSubtotal, data.currency);
  const discount = formatAmount(data.amountDiscount, data.currency);
  const firstName = data.metadata.name.trim().split(/\s+/)[0] ?? "";
  const hasRecurring = data.lineItems.some((li) => li.interval);
  const boughtCms =
    data.metadata.plan === "monthly" ||
    data.lineItems.some((li) => /cms/i.test(li.name ?? ""));

  const links = [
    {
      title: "Billing",
      body: "Track your project, invoices, and subscription.",
      href: "/billing",
    },
    {
      title: "Support",
      body: "Questions or change requests — we're one message away.",
      href: "/billing/support",
    },
    ...(boughtCms
      ? [
          {
            title: "Client Hub",
            body: "Edit your site's content yourself once it's live.",
            href: "/",
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      {/* Hero */}
      <Section delay={0}>
        <div className="space-y-3 text-center">
          <HandCheck className="text-primary mx-auto size-16" />
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Payment confirmed{total ? ` · ${total}` : ""}
          </p>
          <h1 className="text-[27px] font-extrabold tracking-tight sm:text-4xl">
            Welcome aboard{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-muted-foreground mx-auto max-w-md text-sm">
            {data.metadata.company
              ? `The new website for ${data.metadata.company} is officially underway.`
              : "Your new website is officially underway."}{" "}
            Here&apos;s everything you need to get started.
          </p>
        </div>
      </Section>

      {/* Order summary */}
      <Section delay={0.1}>
        <div className="bg-card mt-10 overflow-hidden rounded-lg border">
          <div className="border-rule border-b px-5.5 py-4">
            <p className="text-[11.5px] font-semibold tracking-[0.04em] uppercase">
              Your order
            </p>
          </div>
          <div className="border-rule divide-y">
            {data.lineItems.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex items-center justify-between gap-4 px-5.5 py-4"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <p className="truncate text-sm font-medium">
                    {item.name ?? "Item"}
                    {item.quantity && item.quantity > 1
                      ? ` × ${item.quantity}`
                      : ""}
                  </p>
                  <span
                    className={
                      item.interval
                        ? "bg-status-info-bg text-status-info shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                        : "bg-status-neutral-bg text-status-neutral shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                    }
                  >
                    {item.interval ? "Monthly" : "One-time"}
                  </span>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums">
                  {formatAmount(item.amountTotal, data.currency)}
                  {item.interval ? (
                    <span className="text-muted-foreground">/mo</span>
                  ) : null}
                </p>
              </div>
            ))}
            {data.amountDiscount > 0 && (
              <div className="space-y-1.5 px-5.5 py-4">
                <div className="text-muted-foreground flex items-center justify-between text-sm">
                  <p>Subtotal</p>
                  <p className="tabular-nums">{subtotal}</p>
                </div>
                <div className="text-status-success flex items-center justify-between text-sm font-medium">
                  <p>Discount</p>
                  <p className="tabular-nums">−{discount}</p>
                </div>
              </div>
            )}
          </div>
          <div className="card-band justify-between!">
            <p className="text-[11.5px] font-semibold tracking-[0.04em] uppercase">
              Total{hasRecurring ? " today" : ""}
            </p>
            <p className="text-sm font-extrabold tabular-nums">{total}</p>
          </div>
        </div>
      </Section>

      {/* Account */}
      <Section delay={0.2}>
        {!isLoggedIn && (
          <div className="bg-card mt-6 overflow-hidden rounded-lg border">
            <div className="space-y-2 px-5.5 py-5">
              <p className="text-base font-semibold tracking-tight">
                Create your hub account
              </p>
              <p className="text-muted-foreground text-sm">
                Your client hub is where you track the project, invoices,
                and requests.
                {data.customerEmail ? (
                  <>
                    {" "}
                    Sign up with{" "}
                    <span className="text-foreground font-medium">
                      {data.customerEmail}
                    </span>{" "}
                    — the same email you paid with — so everything connects
                    automatically.
                  </>
                ) : (
                  " Sign up with the same email you paid with so everything connects automatically."
                )}
              </p>
            </div>
            <div className="card-band">
              <Button
                variant="outline"
                className="rounded-full px-5"
                render={<Link href="/sign-in?redirect=%2F" />}
              >
                Sign in
              </Button>
              <Button
                className="rounded-full px-5"
                render={
                  <Link
                    href={`/sign-up?redirect=%2F${
                      data.customerEmail
                        ? `&email=${encodeURIComponent(data.customerEmail)}`
                        : ""
                    }`}
                  />
                }
              >
                Create account
              </Button>
            </div>
          </div>
        )}
      </Section>

      {/* What happens next */}
      <Section delay={0.3}>
        <div className="mt-10">
          <p className="text-[11.5px] font-semibold tracking-[0.04em] uppercase">
            What happens next
          </p>
          <ol className="mt-5 space-y-5">
            {NEXT_STEPS.map((step, index) => (
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
        </div>
      </Section>

      {/* Useful links */}
      <Section delay={0.4}>
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="bg-card group block rounded-lg border px-5.5 py-4.5 transition-colors hover:border-foreground/20"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold tracking-tight">
                  {link.title}
                </p>
                <ArrowUpRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="text-muted-foreground mt-1.5 text-sm">
                {link.body}
              </p>
            </Link>
          ))}
        </div>
      </Section>

      {/* Footer */}
      <Section delay={0.5}>
        <div className="mt-12 space-y-1.5 text-center">
          {data.customerEmail && (
            <p className="text-muted-foreground font-mono text-xs">
              Receipt sent to {data.customerEmail}
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Need anything? Write to {company.agencyEmail}
          </p>
        </div>
      </Section>
    </div>
  );
};
