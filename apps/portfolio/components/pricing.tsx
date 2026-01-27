"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Spinner } from "@workspace/ui/components/spinner";
import { Switch } from "@workspace/ui/components/switch";
import { PageLoading } from "@workspace/ui/custom/page-loading";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  useCheckout,
  useIsUserHaveAccess,
  useSwitchPlan,
} from "@workspace/auth/hooks/use-payments";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export function Pricing() {
  const trpc = useTRPC();
  const products = useQuery(trpc.payments.getProducts.queryOptions());
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="container mx-auto flex flex-col items-center px-4 py-16">
      <div className="mb-8 flex items-center justify-center gap-4">
        <Label htmlFor="billing-toggle" className="text-sm font-medium">
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={isYearly}
          onCheckedChange={setIsYearly}
        />
        <Label htmlFor="billing-toggle" className="text-sm font-medium">
          Yearly
        </Label>
      </div>
      {/* Pricing Cards */}
      <div className="mx-auto flex max-w-6xl flex-wrap gap-8">
        {products.isPending ? (
          <Spinner />
        ) : (
          products.data
            ?.filter((plan) => plan.isArchived === false && plan.isRecurring)
            .filter((plan) =>
              isYearly
                ? plan.recurringInterval === "year"
                : plan.recurringInterval === "month"
            )
            .map((plan) => <EachPlan key={plan.name} plan={plan} />)
        )}
      </div>
    </div>
  );
}

const EachPlan = ({
  plan,
}: {
  plan: RouterOutputs["payments"]["getProducts"][number];
}) => {
  const checkout = useCheckout();
  const switchPlan = useSwitchPlan();
  const { data: currentUser } = useCurrentUser();
  const { currentProductId, currentSubscriptionId } = useIsUserHaveAccess();

  // Calculate discounted price
  const { finalPrice, originalPrice, hasDiscount } = useMemo(() => {
    const original = plan.priceAmount;

    const discount = {
      type: "percentage",
      basisPoints: 0,
    };

    if (discount) {
      // Check if discount applies to this specific plan
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const discountProducts = (discount as any).products || [];
      const appliesToPlan =
        discountProducts.length === 0 || // No products means applies to all plans
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        discountProducts.some((p: any) => p.id === plan.id); // Check if current plan is in the list

      if (!appliesToPlan) {
        // Discount doesn't apply to this plan
        return {
          finalPrice: original,
          originalPrice: original,
          hasDiscount: false,
        };
      }

      const discountType = discount.type;

      if (discountType === "percentage") {
        // For percentage discounts, Polar uses basisPoints (100 basis points = 1%)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const basisPoints = (discount as any).basisPoints || 0;
        const percentage = basisPoints / 100; // Convert to percentage

        if (percentage > 0) {
          // Calculate discounted amount and round to two decimals
          const discountedRaw = original * (1 - percentage / 100);
          const discounted = Math.max(0, Math.round(discountedRaw * 100) / 100);
          return {
            finalPrice: discounted,
            originalPrice: original,
            hasDiscount: true,
          };
        }
      } else if (discountType === "fixed") {
        // For fixed discounts, use discountAmount field
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const discountAmount = (discount as any).amount || 0;

        if (discountAmount > 0) {
          const discounted = Math.max(0, original - discountAmount);
          return {
            finalPrice: discounted,
            originalPrice: original,
            hasDiscount: true,
          };
        }
      }
    }

    return {
      finalPrice: original,
      originalPrice: original,
      hasDiscount: false,
    };
  }, [plan.priceAmount, plan.id]);

  return (
    <div
      key={plan.name}
      className={cn("relative flex flex-col rounded-lg border p-6", {
        "border-primary border-2": plan.popular,
      })}
    >
      {plan.popular && (
        <Badge className="absolute right-1/2 top-0 -translate-y-1/2 translate-x-1/2">
          Most Popular
        </Badge>
      )}
      <h3 className="text-lg font-medium">
        {plan.name.replace("month", "").replace("year", "")}
      </h3>
      <div className="mt-2">
        {hasDiscount && originalPrice !== finalPrice && (
          <p className="text-muted-foreground text-lg">
            <span className="line-through">${originalPrice / 100}</span>
            {plan.isRecurring && (
              <span className="text-muted-foreground text-xs line-through">
                {" "}
                / {plan.recurringInterval}
              </span>
            )}
          </p>
        )}
        <p className="text-4xl font-bold">
          ${finalPrice / 100}{" "}
          {plan.isRecurring && (
            <span className="text-muted-foreground text-sm">
              / {plan.recurringInterval}
            </span>
          )}
        </p>
      </div>
      <p className="text-muted-foreground mt-4 font-medium">
        {plan.description
          ?.split("\n")
          .find((line) => !line.trim().startsWith("-")) || ""}
      </p>
      <Separator className="my-4" />
      <ul className="mb-6 space-y-2">
        {plan.description
          ?.split("\n")
          .filter((line) => line.trim().startsWith("-"))
          .map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CircleCheck className="mt-1 h-4 w-4 text-green-600" />
              {feature.trim().substring(1).trim()}
            </li>
          ))}
      </ul>
      {currentProductId === plan.id ? (
        <Button className="mt-auto w-full">
          <CircleCheck className="text-green-400" />
          Current Plan
        </Button>
      ) : currentProductId ? (
        <Button
          variant={plan.popular ? "default" : "outline"}
          size="lg"
          className="mt-auto w-full"
          onClick={() =>
            switchPlan.mutate({
              subscriptionId: currentSubscriptionId ?? "",
              toProductId: plan.id,
            })
          }
        >
          Switch to {plan.name.replace("month", "").replace("year", "")}
        </Button>
      ) : (
        <Button
          variant={plan.popular ? "default" : "outline"}
          size="lg"
          className="mt-auto w-full"
          onClick={() => checkout.mutate({ productId: plan.id })}
        >
          {plan.trialIntervalCount && plan.trialIntervalCount > 0
            ? `Start your free ${plan.trialIntervalCount} ${plan.trialInterval}${plan.trialIntervalCount > 1 ? "s" : ""} trial`
            : "Get Started"}
        </Button>
      )}
      {currentUser && (
        <PageLoading
          active={checkout.isPending || checkout.isSuccess}
          name={checkout.isSuccess ? "Redirecting" : "Creating"}
        />
      )}
      <PageLoading active={switchPlan.isPending} name="Switching" />
    </div>
  );
};
