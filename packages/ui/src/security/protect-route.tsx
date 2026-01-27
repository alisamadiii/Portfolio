"use client";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { Alert, AlertTitle } from "../components/alert";
import { ErrorComponent } from "./error";

interface ProtectRouteProps {
  children: React.ReactNode;
}

export const ProtectRoute = ({ children }: ProtectRouteProps) => {
  const { error, isError, data: currentUser } = useCurrentUser();

  if (isError) {
    return <ErrorComponent error={error.message} />;
  }

  if (currentUser?.user.banned) {
    return (
      <div className="flex h-full min-h-dvh w-full flex-col items-center justify-center">
        <h2 className="text-2xl font-bold">You are banned from the platform</h2>
        <p className="text-muted-foreground text-sm">
          Please contact the administrator to unban your account.
        </p>
        <Alert variant="destructive" className="mt-4 max-w-sm">
          <AlertTitle>Reason: {currentUser?.user.banReason}</AlertTitle>
        </Alert>
      </div>
    );
  }

  return <div>{children}</div>;
};
