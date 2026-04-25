import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { listPromotionCodes } from "@workspace/auth/payments";

import { adminProcedure, baseProcedure, createTRPCRouter } from "../init";

export const discountsRouter = createTRPCRouter({
  getAll: adminProcedure.query(async () => {
    try {
      return await listPromotionCodes({ limit: 50 });
    } catch (error: unknown) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch discounts",
        cause: error,
      });
    }
  }),

  verify: baseProcedure
    .input(
      z.object({
        code: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const codes = await listPromotionCodes({
          code: input.code,
          active: true,
          limit: 1,
        });

        const promo = codes[0];
        if (!promo) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Discount code not found",
          });
        }

        // Check expiry
        if (promo.expiresAt && promo.expiresAt < Date.now() / 1000) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Discount code has expired",
          });
        }

        // Check max redemptions
        if (
          promo.maxRedemptions &&
          promo.timesRedeemed >= promo.maxRedemptions
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Discount code has been fully redeemed",
          });
        }

        return promo;
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to verify discount",
          cause: error,
        });
      }
    }),
});

export type DiscountsRouter = typeof discountsRouter;
