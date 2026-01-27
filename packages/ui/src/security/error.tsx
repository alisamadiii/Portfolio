"use client";

import { useMutation } from "@tanstack/react-query";

import { Button } from "@workspace/ui/components/button";

import { logout } from "@workspace/auth/action";

export const ErrorComponent = ({
  error,
  reset,
}: {
  error: string;
  reset?: () => void;
}) => {
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await logout();
      return true;
    },
    onSuccess: () => {
      window.location.href = "/login";
    },
  });

  return (
    <div className="flex h-full min-h-dvh w-full flex-col items-center justify-center">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-muted-foreground text-sm">{error}</p>
      {error === "You must be logged in to access this resource" ? (
        <Button className="mt-8" onClick={() => logoutMutation.mutate()}>
          Login
        </Button>
      ) : (
        reset && (
          <Button
            className="mt-8"
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
          >
            Try again
          </Button>
        )
      )}
    </div>
  );
};
