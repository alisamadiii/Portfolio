"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";

import { useLogout } from "@workspace/auth/hooks/use-functions";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export const ProtectRoute = ({ children }: { children: React.ReactNode }) => {
  const { data: currentUser, isPending } = useCurrentUser();

  if (!currentUser && !isPending) {
    return <SessionExpired />;
  }

  return children;
};

const SessionExpired = () => {
  const router = useRouter();
  const logout = useLogout();

  // Clears the stale session cookie before sending the user back to login,
  // so the login page doesn't see a half-valid token.
  const handleRelogin = () => {
    logout.mutate(undefined, {
      onSettled: () => router.push("/login"),
    });
  };

  return (
    <div className="grid min-h-svh place-items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="w-full max-w-[420px] rounded-lg border border-dashed px-6 py-14 text-center"
      >
        <div className="bg-muted text-muted-foreground mx-auto grid size-12.5 place-items-center rounded-[14px]">
          <KeyRound className="size-6" />
        </div>
        <h1 className="mt-4.5 text-[22px] font-extrabold tracking-tight">
          Your session expired
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 mb-5.5 max-w-[320px] text-[14.5px] leading-relaxed">
          You&apos;ve been signed out for security. Log in again to pick up
          right where you left off.
        </p>
        <Button
          size="lg"
          className="rounded-full px-6"
          disabled={logout.isPending}
          onClick={handleRelogin}
        >
          {logout.isPending ? <Spinner className="size-4" /> : "Log in again"}
        </Button>
      </motion.div>
    </div>
  );
};
