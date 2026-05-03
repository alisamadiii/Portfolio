import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

export const useIsPurchased = () => {
  const trpc = useTRPC();
  const queryResult = useQuery(
    trpc.products.isPurchased.queryOptions({ project: "MOTION" })
  );

  return {
    ...queryResult,
    isPurchased: queryResult.data ?? false,
  };
};
