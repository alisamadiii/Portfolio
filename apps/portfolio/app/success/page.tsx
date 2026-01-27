"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Confetti from "canvas-confetti";
import { Mail } from "lucide-react";
import { motion } from "motion/react";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";

export default function SuccessPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}

const Content = () => {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get("checkout_id");

  const trpc = useTRPC();
  const checkoutSession = useQuery(
    trpc.payments.getCheckoutSession.queryOptions(checkoutId || "", {
      enabled: !!checkoutId,
    })
  );

  useEffect(() => {
    if (checkoutSession.data?.status === "succeeded") {
      const duration = 15 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        Confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        Confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      // Cleanup: clear interval when component unmounts or navigates away
      return () => clearInterval(interval);
    }
  }, [checkoutSession.data?.status]);

  console.log(checkoutId);

  if (!checkoutId) {
    return notFound();
  }

  if (checkoutSession.isPending) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2">
        <Spinner />
      </div>
    );
  }

  if (checkoutSession.isError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2">
        <p className="text-destructive">{checkoutSession.error.message}</p>
      </div>
    );
  }

  return checkoutSession.data?.status === "succeeded" ? (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2">
      <SuccessPurchase />
    </div>
  ) : (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2">
      <p className="text-destructive">Failed to get checkout session</p>
    </div>
  );
};

const steps = [
  {
    title: "You're all set",
    description: "Your payment is confirmed and your account is ready.",
  },
  {
    title: "Log in to your account",
    description: "Use your email and password to access your dashboard.",
  },
  {
    title: "Start using the app",
    description: "Explore features and get productive right away.",
  },
];

const SuccessPurchase = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full max-w-xl px-4 py-12"
    >
      <Card>
        <CardHeader className="pb-4 text-center">
          <div className="mb-4 flex justify-center">
            <div className="bg-muted rounded-full p-3">
              <Mail className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="mt-2 text-base">
            Check your email to complete your account setup
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email address display */}
          {/* <div className="bg-muted/50 rounded-lg border p-4">
            <p className="text-muted-foreground mb-2 text-sm">Email sent to:</p>
            <p className="font-medium break-all">{customerEmail}</p>
          </div> */}

          {/* Simple numbered steps */}
          <div className="space-y-4">
            <h3 className="font-semibold">What to do next:</h3>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.title} className="flex gap-3">
                  <div className="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Help section */}
          <div className="rounded-lg border-l-4 border-l-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950/20">
            <p className="mb-1 text-sm font-medium">Having trouble?</p>
            <p className="text-muted-foreground text-sm">
              If you have any questions, please{" "}
              <a
                href="mailto:support@example.com"
                className="text-primary underline"
              >
                contact support
              </a>{" "}
            </p>
            <a
              href="mailto:support@example.com"
              className={buttonVariants({ className: "mt-3" })}
            >
              Contact support
            </a>
          </div>

          {/* Simple button */}
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Return to Homepage</Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
