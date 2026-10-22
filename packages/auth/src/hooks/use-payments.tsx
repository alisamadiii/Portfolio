import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";

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
