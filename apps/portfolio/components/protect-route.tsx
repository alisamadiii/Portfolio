"use client";

import React from "react";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export const ProtectRoute = ({ children }: { children: React.ReactNode }) => {
  const { data: currentUser, isPending } = useCurrentUser();

  if (!currentUser && !isPending) {
    return <div>No user</div>;
  }

  return children;
};
