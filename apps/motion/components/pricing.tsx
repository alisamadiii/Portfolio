"use client";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@workspace/ui/components/button";
import { PageLoading } from "@workspace/ui/custom/page-loading";
import { CircleHalfDashedCheck, CreditCards } from "@workspace/ui/icons";

import { useTRPC } from "@workspace/trpc/client";
import { useCheckout } from "@workspace/auth/hooks/use-payments";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export function Pricing() {
  const trpc = useTRPC();
  const product = useQuery(
    trpc.payments.getProductById.queryOptions(
      "15b61860-5972-4d27-ac18-afe276349f48"
    )
  );
  const checkout = useCheckout();
  const { data: currentUser } = useCurrentUser();
  // const { currentProductId } = useIsUserHaveAccess();

  const isCurrentPlan = false;

  return (
    <div className="container mx-auto flex flex-col items-center px-4 py-16">
      <div className="bg-muted shadow-card relative flex w-full max-w-2xl flex-col rounded-3xl p-8">
        <CreditCards className="size-20" />

        {/* Plan Name */}
        <h3 className="mt-4 text-xl font-semibold">Motion</h3>

        {/* Price Section */}
        <div className="mt-4">
          <p className="text-5xl font-bold tracking-tight">
            ${product.data?.priceAmount ? product.data.priceAmount / 100 : 0}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">one-time payment</p>
        </div>

        {/* CTA Button */}
        <div className="mt-6">
          {isCurrentPlan ? (
            <Button
              className="bg-muted text-muted-foreground hover:bg-muted/80 w-full rounded-xl py-6 text-base font-medium"
              disabled
            >
              Current plan
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              onClick={() =>
                checkout.mutate({ productId: product.data?.id || "" })
              }
            >
              Upgrade to {product.data?.name}
            </Button>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-8">
          <p className="mb-4 text-sm font-semibold">Motion includes:</p>
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li
                key={index}
                className="text-muted-foreground flex items-start gap-3"
              >
                <CircleHalfDashedCheck className="size-5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Loading State */}
        {currentUser && (
          <PageLoading
            active={checkout.isPending || checkout.isSuccess}
            name={checkout.isSuccess ? "Redirecting" : "Creating"}
          />
        )}
      </div>
    </div>
  );
}

const features = [
  "Unlimited projects",
  "Unlimited users",
  "Unlimited storage",
  "Unlimited bandwidth",
  "Unlimited domains",
  "Unlimited email accounts",
  "Unlimited email accounts",
];
