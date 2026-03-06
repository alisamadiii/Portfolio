import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { polarClient } from "@workspace/auth/auth";

export const adminAgencyProductsRouter = createTRPCRouter({
  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        price: z.number(),
        recurringInterval: z.enum(["day", "week", "month", "year"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { name, description, price, recurringInterval } = input;

        const result = await polarClient.products.create({
          name,
          description,
          prices: [
            {
              amountType: "fixed",
              priceAmount: price * 100,
            },
          ],
          recurringInterval,
        });

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create product",
          cause: error,
        });
      }
    }),
});
