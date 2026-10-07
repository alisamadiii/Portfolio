"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { queryClient, useTRPC } from "@workspace/trpc/client";

// Monthly subscription tiers: one Stripe "Lead Finder" product, one price
// per tier. metadata.credits on each PRICE is the monthly allowance the
// balance resets to every billing cycle.
export const BuyCreditsDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const trpc = useTRPC();

  const products = useQuery(trpc.payments.getProducts.queryOptions());
  const product = useMemo(
    () =>
      (products.data ?? []).find(
        (p) =>
          (p.metadata as { project?: string } | null)?.project === "LEADS" &&
          !p.isArchived &&
          p.isRecurring
      ) ?? null,
    [products.data]
  );

  const pricesQuery = useQuery(
    trpc.payments.getProductPrices.queryOptions(
      { productId: product?.id ?? "" },
      { enabled: !!product }
    )
  );
  const state = useQuery(trpc.payments.getCustomerState.queryOptions());

  const activeSub = (state.data?.subscriptions ?? []).find(
    (s) =>
      s.productId === product?.id &&
      (s.status === "active" || s.status === "trialing")
  );

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.payments.getCustomerState.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.leads.credits.get.queryKey(),
    });
  };

  const checkout = useMutation(
    trpc.payments.createCheckout.mutationOptions({
      onSuccess: (data) => {
        if (data?.url) window.location.href = data.url;
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const switchPlan = useMutation(
    trpc.payments.switchPlan.mutationOptions({
      onSuccess: (data) => {
        invalidate();
        if (data.scheduled) {
          toast.success(
            `Downgrade scheduled${
              data.effectiveAt
                ? ` for ${new Date(data.effectiveAt).toLocaleDateString()}`
                : ""
            }. You keep your current plan and credits until this billing cycle ends.`
          );
        } else {
          toast.success(
            "Plan upgraded. Your credits reset to the new allowance in a moment."
          );
        }
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const portal = useMutation(
    trpc.payments.customerPortal.mutationOptions({
      onSuccess: (data) => {
        if (data?.url) window.location.href = data.url;
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const tiers = (pricesQuery.data ?? [])
    .filter((p) => p.recurringInterval === "month")
    .map((p) => ({
      priceId: p.id,
      amount: p.amount,
      credits: Number((p.metadata as { credits?: string }).credits ?? 0),
      popular:
        (p.metadata as { popular?: string } | null)?.popular === "true",
    }));

  const busy = checkout.isPending || switchPlan.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {activeSub ? "Change your plan" : "Choose a plan"}
          </DialogTitle>
          <DialogDescription>
            Credits reset to your plan&apos;s allowance every month. 1 credit
            unlocks 1 real prospect; businesses with a healthy website are
            free. Cancel anytime, leftover credits stay usable.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted rounded-2xl p-3.5 text-sm">
          <p className="font-medium">How a scan spends credits</p>
          <p className="text-muted-foreground mt-1">
            A scan finds <span className="text-foreground font-medium">53</span>{" "}
            businesses and <span className="text-foreground font-medium">12</span>{" "}
            of them have no real website. Those 12 prospects cost{" "}
            <span className="text-foreground font-medium">12 credits</span>; the
            other 41 are free to see.
          </p>
        </div>
        <div className="space-y-2">
          {products.isLoading || pricesQuery.isLoading ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Loading…
            </p>
          ) : !tiers.length ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No plans available right now.
            </p>
          ) : (
            tiers.map((tier) => {
              const isCurrent = activeSub?.priceId === tier.priceId;
              return (
                <button
                  key={tier.priceId}
                  disabled={busy || isCurrent}
                  onClick={() => {
                    if (!product) return;
                    if (activeSub) {
                      // Server decides: upgrades invoice immediately (the
                      // invoice.paid resets credits), downgrades are
                      // scheduled for the end of the billing cycle.
                      switchPlan.mutate({
                        subscriptionId: activeSub.id,
                        toProductId: product.id,
                        toPriceId: tier.priceId,
                      });
                    } else {
                      checkout.mutate({
                        productId: product.id,
                        priceId: tier.priceId,
                        project: "LEADS",
                        callbackUrl: window.location.href,
                      });
                    }
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border p-4 text-left transition-colors disabled:pointer-events-none ${
                    isCurrent
                      ? "border-emerald-300 bg-emerald-50"
                      : tier.popular
                        ? "border-primary bg-primary/5 hover:bg-primary/10"
                        : "border-border hover:bg-muted"
                  } ${busy ? "opacity-50" : ""}`}
                >
                  <div>
                    <p className="font-semibold">
                      {tier.credits.toLocaleString()} credits / month
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {(tier.amount / tier.credits)
                        .toFixed(2)
                        .replace(/\.?0+$/, "")}
                      ¢ per lead
                      {isCurrent ? (
                        <span className="ml-2 inline-flex items-center gap-1 font-medium text-emerald-700">
                          <Check className="size-3.5" /> Current plan
                        </span>
                      ) : tier.popular ? (
                        <span className="text-primary ml-2 inline-flex items-center gap-1 font-medium">
                          <Check className="size-3.5" /> Most popular
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span className="text-xl font-semibold">
                    {busy ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        ${(tier.amount / 100).toFixed(0)}
                        <span className="text-muted-foreground text-sm font-normal">
                          /mo
                        </span>
                      </>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {activeSub && (
          <button
            disabled={portal.isPending}
            onClick={() => portal.mutate({ returnUrl: window.location.href })}
            className="btn-pill btn-light w-full text-sm [&_svg]:size-4"
          >
            {portal.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ExternalLink />
            )}
            Manage billing in Stripe
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
};
