import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";
import { authClient, signIn, signUp } from "@workspace/auth/auth-client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

const useSignup = () => {
  const router = useRouter();
  const trpc = useTRPC();

  return useMutation({
    mutationFn: async (values: {
      email: string;
      password: string;
      name: string;
    }) => {
      const response = await signUp.email({
        email: values.email,
        name: values.name,
        password: values.password,
      });

      if (response.error) {
        throw new Error(response.error.message || response.error.statusText);
      }

      const emailOtpResponse = await authClient.emailOtp.sendVerificationOtp({
        email: values.email,
        type: "email-verification",
      });

      if (emailOtpResponse.error) {
        throw new Error(
          emailOtpResponse.error.message || emailOtpResponse.error.statusText
        );
      }

      return response;
    },
    onSuccess: () => {
      router.push("/verify-email");
      router.refresh();
      queryClient.setQueryData(trpc.user.getCurrentUser.queryKey(), (old) => {
        return old;
      });
    },
  });
};

/**
 * Custom hook for user sign-in functionality
 * Handles email/password authentication and session management
 * @returns UseMutationResult for sign-in operation
 */
const useSignin = () => {
  const router = useRouter();
  const trpc = useTRPC();

  return useMutation({
    mutationFn: async (values: { email: string; password: string }) => {
      const response = await signIn.email({
        email: values.email,
        password: values.password,
      });

      if (response.error) {
        throw new Error(response.error.message || response.error.statusText);
      }

      const { data, error } = await authClient.getSession();

      if (error) {
        throw new Error(error.message || error.statusText);
      }

      return data;
    },
    onSuccess: (response) => {
      router.refresh();
      if (response) {
        queryClient.setQueryData(trpc.user.getCurrentUser.queryKey(), () => {
          const data: RouterOutputs["user"]["getCurrentUser"] = {
            session: {
              id: response.session.id,
              createdAt: response.session.createdAt.toISOString(),
              updatedAt: response.session.updatedAt.toISOString(),
              userId: response.session.userId,
              expiresAt: response.session.expiresAt.toISOString(),
              token: response.session.token,
              ipAddress: response.session.ipAddress,
              userAgent: response.session.userAgent,
            },
            user: {
              id: response.user.id,
              createdAt: response.user.createdAt.toISOString(),
              updatedAt: response.user.updatedAt.toISOString(),
              email: response.user.email,
              emailVerified: response.user.emailVerified,
              name: response.user.name,
              image: response.user.image,
              metadata: response.user.metadata,
            },
          };

          return data;
        });
      }
    },
    onError: () => {},
  });
};

/**
 * Custom hook for social provider sign-in (GitHub or Google)
 * @param provider - The social provider to use for authentication
 * @returns UseMutationResult for social sign-in operation
 */
export function useSignInWithProvider(provider: "github" | "google") {
  return useMutation({
    mutationFn: async ({ redirectUrl }: { redirectUrl: string }) => {
      const { data, error } = await signIn.social({
        provider,
        callbackURL: redirectUrl,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  });
}

/**
 * Custom hook for sending password reset email
 * @returns UseMutationResult for password reset email operation
 */
const useSendResetEmail = () => {
  return useMutation({
    mutationFn: async ({
      email,
      redirectTo,
    }: {
      email: string;
      redirectTo: string;
    }) => {
      const { data, error } = await authClient.requestPasswordReset({
        email,
        redirectTo,
      });

      if (error) {
        throw new Error(error.message || error.statusText);
      }

      return data;
    },
  });
};

/**
 * Custom hook for resetting user password
 * @returns UseMutationResult for password reset operation
 */
const useResetPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      newPassword,
      token,
    }: {
      newPassword: string;
      token: string;
    }) => {
      const { data, error } = await authClient.resetPassword({
        newPassword, // required
        token, // required
      });

      if (error) {
        throw new Error(error.message || error.statusText);
      }

      return data;
    },
    onSuccess: () => {
      router.push("/login");
    },
  });
};

/**
 * Custom hook for email verification using OTP
 * @returns UseMutationResult for email verification operation
 */
const useVerifyEmail = () => {
  const router = useRouter();
  const { data: user } = useCurrentUser();

  const trpc = useTRPC();

  return useMutation({
    mutationFn: async (otp: string) => {
      const { data, error } = await authClient.emailOtp.verifyEmail({
        email: user?.user?.email || "",
        otp: otp,
      });

      if (error) {
        throw new Error(error.message || error.statusText);
      }

      return data;
    },
    onSuccess: async () => {
      queryClient.setQueryData(trpc.user.getCurrentUser.queryKey(), (old) => {
        if (!old) return old;
        return {
          ...old,
          user: { ...old.user, emailVerified: true },
        };
      });

      setTimeout(() => {
        router.push("/choose-plan");
      }, 2000);
    },
    onError: () => {},
  });
};

/**
 * Custom hook for resending email verification OTP
 * @returns UseMutationResult for resending email verification operation
 */
const useResendEmailVerification = () => {
  const { data: currentUser } = useCurrentUser();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.emailOtp.sendVerificationOtp({
        email: currentUser?.user?.email || "",
        type: "email-verification",
      });

      if (error) {
        throw new Error(error.message || error.statusText);
      }

      return data;
    },
  });
};

/**
 * Custom hook for user logout functionality
 * Clears user session and invalidates related queries
 * @returns UseMutationResult for logout operation
 */
const useLogout = () => {
  const trpc = useTRPC();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.signOut();

      if (error) {
        throw new Error(error.message || error.statusText);
      }

      return data;
    },
    onSuccess: () => {
      // Reset all queries except the "products" queries
      const allQueries = queryClient.getQueryCache().getAll();
      router.refresh();
      allQueries.forEach((query) => {
        const queryKey = query.queryKey;
        // Check if the top-level key is "products"
        if (!queryKey || queryKey === trpc.payments.getProducts.queryKey())
          return;
        queryClient.resetQueries({ queryKey });
      });
    },
  });
};

export {
  useSignup,
  useSignin,
  useSendResetEmail,
  useResetPassword,
  useVerifyEmail,
  useResendEmailVerification,
  useLogout,
};
