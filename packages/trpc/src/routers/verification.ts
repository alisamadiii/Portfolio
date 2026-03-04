import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { generateId } from "@workspace/ui/lib/utils";

import { db } from "@workspace/drizzle/index";
import { verification } from "@workspace/drizzle/schema";

import { baseProcedure, createTRPCRouter } from "../init";

export const verificationRouter = createTRPCRouter({
  get: baseProcedure.input(z.string()).query(async ({ input }) => {
    try {
      const verificationResult = await db
        .select()
        .from(verification)
        .where(eq(verification.id, input))
        .limit(1)
        .then((result) => result[0]);
      return verificationResult;
    } catch (error) {
      throw new TRPCError({
        code: error instanceof TRPCError ? error.code : "INTERNAL_SERVER_ERROR",
        message:
          error instanceof TRPCError
            ? error.message
            : "Failed to get verification",
        cause: error,
      });
    }
  }),
  create: baseProcedure
    .input(
      z.object({
        identifier: z.string().min(1),
        value: z.string(),
        expiresIn: z.number(), // minutes
      })
    )
    .mutation(async ({ input }) => {
      try {
        const [verificationResult] = await db
          .insert(verification)
          .values({
            id: generateId(),
            identifier: input.identifier,
            value: input.value,
            expiresAt: new Date(Date.now() + input.expiresIn * 60 * 1000), // Convert minutes to milliseconds
          })
          .returning();

        return verificationResult;
      } catch (error) {
        throw new TRPCError({
          code:
            error instanceof TRPCError ? error.code : "INTERNAL_SERVER_ERROR",
          message:
            error instanceof TRPCError
              ? error.message
              : "Failed to create verification",
          cause: error,
        });
      }
    }),
  delete: baseProcedure.input(z.string()).mutation(async ({ input }) => {
    try {
      const verificationResult = await db
        .delete(verification)
        .where(eq(verification.id, input));
      return verificationResult;
    } catch (error) {
      throw new TRPCError({
        code: error instanceof TRPCError ? error.code : "INTERNAL_SERVER_ERROR",
        message:
          error instanceof TRPCError
            ? error.message
            : "Failed to delete verification",
        cause: error,
      });
    }
  }),
});
