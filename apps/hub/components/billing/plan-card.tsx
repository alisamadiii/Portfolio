"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Globe } from "@/components/icon";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

// The single per-project plan card, rendered everywhere it can be bought:
// the Billing picker, the Emails/Analytics paywalls, and the 402 purchase
// dialog (compact). All copy + pricing come from the Stripe product via the
// DB mirror (name, description, price, interval, marketing features) — edit
// the product in the Stripe dashboard and the webhook updates this card with
// no deploy. Only the per-project suffix and footnote are hardcoded.

const formatPrice = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);

export const PlanCard = ({
  onSubscribe,
  isCheckingOut,
  compact = false,
}: {
  onSubscribe: () => void;
  isCheckingOut: boolean;
  /** Dialog variant: tighter padding, no accent wash. */
  compact?: boolean;
}) => {
  const trpc = useTRPC();
  const product = useQuery(trpc.products.getForPlan.queryOptions("website:paid"));

  const features =
    ((product.data?.metadata as { features?: string[] } | null)?.features ??
      []) as string[];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-line bg-surface",
        !compact && "max-w-md"
      )}
    >

      <div className={cn("relative", compact ? "p-5" : "p-6")}>
        {product.isPending ? (
          <div className="space-y-4">
            <Skeleton className="size-11 rounded-[12px]" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <>
            <div className="grid size-10 place-items-center rounded-[9px] bg-coral-soft text-coral-deep">
              <Globe className="size-5" />
            </div>
            <p className="mt-4 text-base font-semibold">
              {product.data?.name ?? "Website Management"}
            </p>
            {product.data?.description && (
              <p className="text-muted-foreground mt-1 text-[13.5px]">
                {product.data.description}
              </p>
            )}

            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold tracking-[-0.01em]">
                {formatPrice(
                  product.data?.priceAmount ?? 2500,
                  product.data?.priceCurrency ?? "usd"
                )}
              </span>
              <span className="text-muted-foreground text-[13.5px] font-medium">
                /{product.data?.recurringInterval ?? "month"} · per project
              </span>
            </div>

            {features.length > 0 && (
              <ul className="mt-5 space-y-2.5">
                {features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-[13.5px]"
                  >
                    <span className="bg-status-success-bg grid size-5 shrink-0 place-items-center rounded-full">
                      <Check className="text-status-success size-3.5" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <Button
              className="mt-6 w-full"
              disabled={isCheckingOut}
              isLoading={isCheckingOut}
              onClick={onSubscribe}
            >
              Subscribe
            </Button>
            <p className="text-muted-foreground mt-3 text-center text-xs">
              Cancel anytime. Deleting the project refunds the unused time.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
