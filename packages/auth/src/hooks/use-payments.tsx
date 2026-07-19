import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import { authClient } from "@workspace/auth/auth-client";

/**
 * Custom hook for fetching customer state and subscription information
 * @returns UseQueryResult<CustomerState> - Query result containing customer state data
 */
export const useGetCustomerState = () => {
  return useQuery({
    queryKey: ["customer-state"],
    queryFn: async () => {
      const product = await authClient.customer.state();

      if (product.error) {
        throw new Error(product.error.message || product.error.statusText);
      }

      return product;
    },
  });
};

/**
 * Custom hook for checking if user has access based on subscription status
 * @returns Object containing access status, current product ID, subscription ID, and query state
 */
export const useIsUserHaveAccess = () => {
  const customerStateQuery = useGetCustomerState();

  return {
    isUserHaveAccess:
      customerStateQuery.data?.data?.activeSubscriptions?.[0]?.status ===
        "active" ||
      customerStateQuery.data?.data?.activeSubscriptions?.[0]?.status ===
        "trialing",
    currentProductId:
      customerStateQuery.data?.data?.activeSubscriptions?.[0]?.productId,
    currentSubscriptionId:
      customerStateQuery.data?.data?.activeSubscriptions?.[0]?.id,
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
          // Signup lives on the portal — the old portfolio /signup never existed.
          // Inlined rather than imported from @workspace/ui: ui already depends
          // on auth, and importing back would close the dependency cycle.
          const portal =
            process.env.NODE_ENV === "development"
              ? "http://localhost:3006"
              : "https://portal.alisamadii.com";
          window.location.href = `${portal}/signup?redirectUrl=${encodeURIComponent(window.location.href)}`;
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
        // Wait for 3 seconds to simulate the switch plan process
        await new Promise((resolve) => setTimeout(resolve, 3000));
        queryClient.invalidateQueries({ queryKey: ["customer-state"] });
      },
    })
  );
};

/**
 * Custom hook for generating customer portal link
 * @returns UseMutationResult for generating portal link operation
 */
export const useGeneratePortalLink = () => {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.customer.portal();

      if (error) {
        throw new Error(error.message || error.statusText);
      }

      return data;
    },
  });
};
