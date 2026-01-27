import { TRPCError } from "@trpc/server";
import { isPast } from "date-fns";
import { z } from "zod";

import { polarClient } from "@workspace/auth/auth";

import { adminProcedure, baseProcedure, createTRPCRouter } from "../init";

async function getAllDiscounts() {
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
}

export const discountsRouter = createTRPCRouter({
  getAll: adminProcedure.query(getAllDiscounts),
  verifyCode: baseProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      try {
        const discounts = await getAllDiscounts();

        const discount = discounts?.find(
          (discount) =>
            discount.code?.toLowerCase() === input.code?.toLowerCase()
        );

        if (!discount) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Discount not found",
          });
        }

        if (
          discount.maxRedemptions &&
          discount.redemptionsCount >= discount.maxRedemptions
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Discount has reached the maximum number of redemptions",
          });
        } else if (discount.endsAt && isPast(discount.endsAt)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Discount has expired",
          });
        }

        return discount;
      } catch (error) {
        throw new TRPCError({
          code:
            error instanceof TRPCError ? error.code : "INTERNAL_SERVER_ERROR",
          message:
            error instanceof TRPCError
              ? error.message
              : "Failed to verify discount",
          cause: error instanceof TRPCError ? error.cause : undefined,
        });
      }
    }),
});

export type DiscountsRouter = typeof discountsRouter;
