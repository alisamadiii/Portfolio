import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryClient, useTRPC } from "@workspace/trpc/client";

/**
 * Fetch current user's subscription state from local DB
 */
export const useGetCustomerState = () => {
  const trpc = useTRPC();
  return useQuery(trpc.billing.getCustomerState.queryOptions());
};

/**
 * Check if user has active subscription access
 */
export const useIsUserHaveAccess = () => {
  const customerStateQuery = useGetCustomerState();

  return {
    isUserHaveAccess: customerStateQuery.data?.isUserHaveAccess ?? false,
    currentProductId: customerStateQuery.data?.currentPlan ?? undefined,
    currentSubscriptionId:
      customerStateQuery.data?.currentSubscriptionId ?? undefined,
    ...customerStateQuery,
  };
};

/**
 * Initiate Stripe checkout
 */
export const useCheckout = () => {
  const router = useRouter();
  const trpc = useTRPC();

  const mutation = useMutation(
    trpc.billing.createCheckout.mutationOptions({
      onSuccess: (data) => {
        if (!data?.url) {
          throw new Error("Failed to create checkout");
        }
        /* eslint-disable-next-line react-hooks/immutability */
        window.location.href = data.url;
      },
      onError: (error, variables) => {
        if (error.data?.code === "UNAUTHORIZED") {
          router.push(
            `/signup?callbackUrl=/checkout&priceIds=${variables.priceIds.join(",")}`
          );
          return;
        }
        toast.error(
          error.message || "Failed to create checkout. Please try again."
        );
      },
    })
  );

  return {
    ...mutation,
    mutate: (
      input: { priceIds: string[]; successUrl?: string; cancelUrl?: string },
      options?: Parameters<typeof mutation.mutate>[1]
    ) => {
      mutation.mutate(
        {
          ...input,
          cancelUrl: input.cancelUrl ?? window.location.href,
        },
        options
      );
    },
  };
};

/**
 * Switch subscription plan
 */
export const useSwitchPlan = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.billing.switchPlan.mutationOptions({
      onSuccess: (_data, variables) => {
        toast.success(
          variables.immediate !== false
            ? "Plan upgraded successfully"
            : "Downgrade scheduled for end of billing period"
        );
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: trpc.billing.getCustomerState.queryKey(),
          });
        }, 2000);
      },
      onError: () => {
        toast.error("Failed to switch plan");
      },
    })
  );
};

/**
 * Fetches full subscription details live from Stripe (all items, status, etc.)
 */
export const useSubscriptionDetails = (subscriptionId: string | null) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.billing.getSubscriptionDetails.queryOptions({
      subscriptionId: subscriptionId ?? "",
    }),
    enabled: !!subscriptionId,
  });
};

/**
 * Generate Stripe billing portal link
 */
export const useGeneratePortalLink = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.billing.createPortalSession.mutationOptions({
      onSuccess: (data) => {
        /* eslint-disable-next-line react-hooks/immutability */
        window.location.href = data.url;
      },
    })
  );
};
