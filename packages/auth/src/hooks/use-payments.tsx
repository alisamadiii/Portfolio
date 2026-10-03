import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryClient, useTRPC } from "@workspace/trpc/client";

/**
 * Custom hook for fetching customer state and subscription information
 * (DB mirror of Stripe subscriptions/orders, synced by the Stripe webhook).
 */
export const useGetCustomerState = () => {
  const trpc = useTRPC();
  return useQuery(trpc.payments.getCustomerState.queryOptions());
};

/**
 * Custom hook for checking if user has access based on subscription status
 * @returns Object containing access status, current product ID, subscription ID, and query state
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
 * Custom hook for initiating checkout process
 * @returns UseMutationResult for checkout operation
 */
export const useCheckout = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.payments.createCheckout.mutationOptions({
      onSuccess: (data) => {
        if (!data) {
          throw new Error("Failed to create checkout");
        }

        /* eslint-disable-next-line react-hooks/immutability */
        window.location.href = data.url;
      },
      onError: (error) => {
        if (error.data?.code === "UNAUTHORIZED") {
          // Signup lives on the Client Hub — the old portfolio /signup never
          // existed. Inlined rather than imported from @workspace/ui: ui
          // already depends on auth, and importing back would close the
          // dependency cycle.
          const hub =
            process.env.NODE_ENV === "development"
              ? "http://localhost:3007"
              : "https://hub.alisamadii.com";
          window.location.href = `${hub}/sign-up?redirectUrl=${encodeURIComponent(window.location.href)}`;
          return;
        }
        toast.error(error.message);
      },
    })
  );
};

/**
 * Custom hook for switching subscription plan
 * @returns UseMutationResult for switching plan operation
 */
export const useSwitchPlan = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.payments.switchPlan.mutationOptions({
      onSuccess: async () => {
        // The webhook needs a beat to sync the mirror before refetching.
        await new Promise((resolve) => setTimeout(resolve, 3000));
        queryClient.invalidateQueries({
          queryKey: trpc.payments.getCustomerState.queryKey(),
        });
      },
    })
  );
};

/**
 * Custom hook for generating the Stripe billing-portal link and sending the
 * user there.
 */
export const useGeneratePortalLink = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.payments.customerPortal.mutationOptions({
      onSuccess: (data) => {
        /* eslint-disable-next-line react-hooks/immutability */
        window.location.href = data.url;
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );
};
