import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, useTRPC } from "@workspace/trpc/client";

const useCurrentUser = () => {
  const trpc = useTRPC();
  return useQuery(
    trpc.user.getCurrentUser.queryOptions(undefined, {
      refetchOnWindowFocus: false,
    })
  );
};

const useUpdateUser = () => {
  const trpc = useTRPC();
  return useMutation(
    trpc.user.updateUser.mutationOptions({
      onSuccess: (_, variables) => {
        queryClient.setQueryData(trpc.user.getCurrentUser.queryKey(), (old) => {
          if (!old) return old;
          return {
            ...old,
            user: {
              ...old.user,
              ...variables,
            },
          };
        });
      },
      onError: (error) => {
        console.error(error);
      },
    })
  );
};

const useRevokeSession = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.sessions.revokeSession.mutationOptions({
      onSuccess: (_, sessionId) => {
        queryClient.invalidateQueries({
          queryKey: trpc.sessions.getSessions.queryKey(sessionId),
        });
      },
    })
  );
};

export { useCurrentUser, useUpdateUser, useRevokeSession };
