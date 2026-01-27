import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { verification } from "@workspace/drizzle/schema";

import {
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "../init";
import { rateLimit } from "../middleware/rate-limit";

export const userRouter = createTRPCRouter({
  /**
   * Fetches the current user
   * @returns Promise<User> - The current user from session
   */
  getCurrentUser: authenticatedProcedure.query(async ({ ctx }) => {
    return ctx.session;
  }),
  testRateLimit: baseProcedure.mutation(async () => {
    await rateLimit();
    return "Rate limit test";
  }),
  /**
   * Fetches the current user session
   * @returns Promise<User> - The current user from session
   */
  getSession: authenticatedProcedure
    .input(
      z.object({
        headers: z.instanceof(Headers),
      })
    )
    .query(async ({ input }) => {
      try {
        const { headers } = input;
        const session = await auth.api.getSession({
          headers,
        });

        return session?.user;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch user",
          cause: error,
        });
      }
    }),

  /**
   * Updates a user's information
   * @param data - Partial user data to update
   * @returns Promise<void>
   */
  updateUser: authenticatedProcedure
    .input(
      z
        .object({
          name: z.string().optional(),
          image: z.string().optional(),
        })
        .partial()
        .refine(
          (data) => {
            // Ensure at least one field is provided
            return Object.keys(data).length > 0;
          },
          {
            message: "At least one field must be provided for update",
          }
        )
        .strict() // Only allow defined fields (type-safe with User.$inferSelect)
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await auth.api.updateUser({
          headers: await headers(),
          body: {
            ...input,
          },
        });

        return { userId: ctx.session.user.id };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to update user",
          cause: error,
        });
      }
    }),

  /**
   * Fetches all accounts linked to the current user
   * @returns Promise<Account[]> - Array of linked accounts
   */
  getAccounts: authenticatedProcedure
    .input(z.string().optional())
    .query(async ({ input, ctx }) => {
      try {
        const userId = input;
        const accounts = await (
          await auth.$context
        ).internalAdapter.findAccounts(userId ?? ctx.session.user.id);
        return accounts;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch accounts",
          cause: error,
        });
      }
    }),

  /**
   * Validates a password reset token
   * @param token - The reset password token to validate
   * @returns Promise<Verification> - The verification record if token is valid
   */
  validateResetPassword: baseProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const data = await db
          .select()
          .from(verification)
          .where(eq(verification.identifier, `reset-password:${input.token}`))
          .then((res) => res[0]);

        if (!data) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid token",
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to validate token",
          cause: error,
        });
      }
    }),
});
