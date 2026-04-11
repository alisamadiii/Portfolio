import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { auth } from "@workspace/auth/auth";

import {
  authenticatedProcedure,
  createTRPCRouter,
} from "../init";

export const userRouter = createTRPCRouter({
  /**
   * Fetches the current user
   * @returns Promise<User> - The current user from session
   */
  getCurrentUser: authenticatedProcedure.query(async ({ ctx }) => {
    return ctx.session;
  }),
  /**
   * Fetches the current user session
   * Uses the incoming request headers (from next/headers) so it works for both
   * in-process and HTTP callers (e.g. admin → API); cookies are forwarded by the caller.
   * @returns Promise<User> - The current user from session
   */
  getSession: authenticatedProcedure.query(async ({ ctx }) => {
    return ctx.session.user;
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
          phone: z.string().optional(),
          company: z.string().optional(),
          address: z.string().optional(),
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

});
