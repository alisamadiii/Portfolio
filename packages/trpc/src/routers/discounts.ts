import { TRPCError } from "@trpc/server";

import { polarClient } from "@workspace/auth/auth";

import { adminProcedure, createTRPCRouter } from "../init";

export const discountsRouter = createTRPCRouter({
  getAll: adminProcedure.query(async () => {
    try {
      const response = await polarClient.discounts.list({});
      return response.result.items;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch discounts",
        cause: error,
      });
    }
  }),
});

export type DiscountsRouter = typeof discountsRouter;
