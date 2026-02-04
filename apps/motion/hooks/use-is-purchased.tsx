import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

export const useIsPurchased = () => {
  const trpc = useTRPC();
  const queryResult = useQuery(trpc.motion.isUserPurchased.queryOptions());

  return {
    ...queryResult,
    isPurchased: queryResult.data ?? false,
  };
};
