"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, useTRPC } from "@workspace/trpc/client";

import { authClient } from "../auth-client";

export function SessionRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const trpc = useTRPC();

  const { data } = useQuery(
    trpc.users.checkRefresh.queryOptions(undefined, {
      refetchInterval: 30_000,
    })
  );

  const clearRefresh = useMutation(trpc.users.clearRefresh.mutationOptions());

  useEffect(() => {
    if (!data?.needsRefresh) return;

    (async () => {
      // Force Better Auth to bypass cookie cache and fetch fresh session from DB
      await authClient.getSession({
        fetchOptions: {
          query: { disableCookieCache: true },
        },
      });

      // Invalidate React Query cache so UI picks up new session data
      await queryClient.invalidateQueries({
        queryKey: trpc.users.getCurrent.queryKey(),
      });

      // Clear the refresh signal
      clearRefresh.mutate();
    })();
  }, [data?.needsRefresh]);

  return children;
}
