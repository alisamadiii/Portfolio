import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryClient, useTRPC } from "@workspace/trpc/client";

/**
 * Fetch current user's subscription state from local DB
 */
export const useGetCustomerState = () => {
  const trpc = useTRPC();
  return useQuery(trpc.payments.getCustomerState.queryOptions());
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
          router.push(
            process.env.NODE_ENV === "development"
              ? `http://localhost:3000/signup?redirectUrl=${window.location.href}`
              : `https://www.alisamadii.com/signup?redirectUrl=${window.location.href}`
          );
          return;
        }
        toast.error(error.message);
      },
    })
  );
};

/**
 * Switch subscription plan
 */
export const useSwitchPlan = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.payments.switchPlan.mutationOptions({
      onSuccess: async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        queryClient.invalidateQueries({
          queryKey: ["payments", "getCustomerState"],
        });
      },
    })
  );
};

/**
 * Generate Stripe billing portal link
 */
export const useGeneratePortalLink = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.payments.createPortalSession.mutationOptions({
      onSuccess: (data) => {
        /* eslint-disable-next-line react-hooks/immutability */
        window.location.href = data.url;
      },
    })
  );
};
