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
      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl bg-zinc-100 p-8 text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100">
        <CreditCards className="size-20" />

        {/* Plan Name */}
        <h3 className="mt-4 text-xl font-semibold text-zinc-700 dark:text-zinc-300">
          Motion
        </h3>

        {/* Price Section */}
        <div className="mt-4">
          <p className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
            ${product.data?.priceAmount ? product.data.priceAmount / 100 : 0}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            one-time payment
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-6">
          {isCurrentPlan ? (
            <Button
              className="w-full rounded-xl bg-zinc-300 py-6 text-base font-medium text-zinc-600 hover:bg-zinc-400 dark:bg-zinc-600 dark:text-zinc-300"
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
          <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
            Motion includes:
          </p>
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
