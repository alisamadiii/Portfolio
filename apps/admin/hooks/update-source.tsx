import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

export const useUpdateSource = (sourceId: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateSource = useMutation(
    trpc.source.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.source.readById.queryKey(sourceId),
        });
      },
    })
  );

  return updateSource;
};
