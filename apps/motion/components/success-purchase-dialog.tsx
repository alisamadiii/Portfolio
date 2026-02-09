"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Confetti from "canvas-confetti";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Spinner } from "@workspace/ui/components/spinner";
import { HandCheck } from "@workspace/ui/icons";

import { useTRPC } from "@workspace/trpc/client";

export const SuccessPurchaseDialog = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get("checkout_id");
  const hasFiredConfetti = useRef(false);

  const trpc = useTRPC();
  const checkoutSession = useQuery({
    ...trpc.payments.getCheckoutSession.queryOptions(checkoutId ?? ""),
    enabled: !!checkoutId,
  });

  const succeeded = checkoutSession.data?.status === "succeeded";
  const open = !!checkoutId;

  useEffect(() => {
    if (!open || !succeeded || hasFiredConfetti.current) return;
    hasFiredConfetti.current = true;

    const run = () => {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 10000,
      };

      function fire(
        particleRatio: number,
        opts: Parameters<typeof Confetti>[0]
      ) {
        Confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    };

    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [open, succeeded]);

  const handleClose = () => {
    // Strip all search params; stay on current path (pathname has no query)
    router.push(pathname);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!!checkoutSession.data}
        onPointerDownOutside={(e) => {
          if (!checkoutSession.data) e.preventDefault();
        }}
      >
        {checkoutSession.isPending && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner className="size-8" />
            <p className="text-muted-foreground text-sm">
              Confirming your purchase…
            </p>
          </div>
        )}

        {checkoutSession.isError && (
          <>
            <DialogHeader>
              <DialogTitle>Something went wrong</DialogTitle>
              <DialogDescription>
                We couldn’t verify your purchase. If you were charged, please
                contact support with your checkout ID.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}

        {succeeded && (
          <>
            <DialogHeader className="text-center sm:text-center">
              <HandCheck className="text-primary mx-auto size-16" />
              <DialogTitle className="text-xl font-black md:text-2xl">
                Thank you for your purchase!
              </DialogTitle>
              <DialogDescription className="text-sm">
                You now have full access to the animation. Start exploring and
                use the source code in your own projects.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-8 flex flex-col gap-2 sm:flex-col">
              <Button
                asChild
                className="w-full sm:w-auto"
                onClick={handleClose}
                size="lg"
              >
                <Link href="/m">Browse animations</Link>
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleClose}
                size="lg"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
