"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { useTRPC } from "@workspace/trpc/client";

export const BuyCreditsDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const trpc = useTRPC();

  const products = useQuery(trpc.payments.getProducts.queryOptions());
  const checkout = useMutation(
    trpc.payments.createCheckout.mutationOptions({
      onSuccess: (data) => {
        if (data?.url) window.location.href = data.url;
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const packs = (products.data ?? [])
    .filter(
      (p) =>
        (p.metadata as { project?: string } | null)?.project === "LEADS" &&
        !p.isArchived &&
        !p.isRecurring
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      priceAmount: p.priceAmount,
      credits: Number((p.metadata as { credits?: string }).credits ?? 0),
      popular: p.popular,
    }))
    .sort((a, b) => a.priceAmount - b.priceAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy credits</DialogTitle>
          <DialogDescription>
            1 credit unlocks 1 lead: a business with no working website.
            Credits never expire.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {products.isLoading ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Loading…
            </p>
          ) : !packs.length ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No credit packs available right now.
            </p>
          ) : (
            packs.map((pack) => (
              <button
                key={pack.id}
                disabled={checkout.isPending}
                onClick={() =>
                  checkout.mutate({
                    productId: pack.id,
                    project: "LEADS",
                    callbackUrl: window.location.href,
                  })
                }
                className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border p-4 text-left transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                  pack.popular
                    ? "border-primary bg-primary/5 hover:bg-primary/10"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div>
                  <p className="font-semibold">
                    {pack.credits.toLocaleString()} credits
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {(pack.priceAmount / pack.credits)
                      .toFixed(1)
                      .replace(/\.0$/, "")}
                    ¢ per lead
                    {pack.popular && (
                      <span className="text-primary ml-2 inline-flex items-center gap-1 font-medium">
                        <Check className="size-3.5" /> Most popular
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xl font-semibold">
                  {checkout.isPending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    `$${(pack.priceAmount / 100).toFixed(0)}`
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
