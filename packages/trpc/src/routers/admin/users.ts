import { cookies, headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { auth, polarClient } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { user } from "@workspace/drizzle/schema";

export const adminUsersRouter = createTRPCRouter({
  /**
   * Fetches a user by their ID
   * @param id - The ID of the user to fetch
   * @returns Promise<User | undefined> - The user with matching ID or undefined if not found
   */
  getById: adminProcedure.input(z.string()).query(async ({ input }) => {
    try {
      const userResult = await db
        .select()
        .from(user)
        .where(eq(user.id, input))
        .limit(1)
        .then((result) => result[0]);
      return userResult;
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
   * Router for fetching users with pagination, sorting, and search
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of users per page (default: 10)
   * @param sortBy - Field to sort by (email, banned, or createdAt)
   * @param search - Search term to filter users by email or name
   * @returns Promise<User[]> - Array of users matching the filter criteria
   */
  getAll: adminProcedure
    .input(
      z.object({
        page: z.number().optional(),
        limit: z.number().optional(),
        sortBy: z.enum(["email", "created", "banned"]).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { page = 1, limit = 10, sortBy, search } = input;

        const offset = (page - 1) * limit;

        const users = await db
          .select()
          .from(user)
          .limit(limit)
          .offset(offset)
          .orderBy(
            sortBy === "email"
              ? desc(user.email)
              : sortBy === "banned"
                ? desc(user.banned)
                : desc(user.createdAt)
          )
          .where(
            search
              ? or(
                  ilike(user.email, `%${search}%`),
                  ilike(user.name, `%${search}%`)
                )
              : undefined
          );

        return users;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch users",
          cause: error,
        });
      }
    }),
  /**
   * Gets the total count of users in the database
   * @returns Promise<{count: number}[]> - Array containing the total user count
   */
  getCount: adminProcedure.query(async () => {
    try {
      const countResult = await db.select({ count: count() }).from(user);
      return countResult;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch users count",
        cause: error,
      });
    }
  }),

  /**
   * Updates a user's information
   * @param id - The ID of the user to update
   * @param data - Partial user data to update
   * @returns Promise<User | undefined> - The updated user or undefined if not found
   */
  update: adminProcedure
    .input(
      z
        .object({
          id: z.string(),
          name: z.string().optional(),
          image: z.string().optional(),
          banned: z.boolean().optional(),
          banReason: z.string().optional(),
          role: z.enum(["user", "admin"]).optional(),
          emailVerified: z.boolean().optional(),
        })
        .refine(
          (data) => {
            // Ensure at least one field is provided
            return Object.keys(data).length > 0;
          },
          {
            message: "At least one field must be provided for update",
          }
        )
    )
    .mutation(async ({ input }) => {
      try {
        const { id, ...data } = input;

        if (!id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User ID is required",
          });
        }

        const updatedUser = await db
          .update(user)
          .set(data)
          .where(eq(user.id, id))
          .returning()
          .then((result) => result[0]);

        return updatedUser;
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
   * Changes a user's password and optionally revokes all sessions
   * @param newPassword - The new password to set
   * @param userId - The ID of the user whose password to change
   * @param revokeAllSessions - Whether to revoke all existing sessions
   * @returns Promise<boolean> - Result of the password change operation
   */
  updatePassword: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        newPassword: z.string(),
        revokeAllSessions: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, newPassword, revokeAllSessions } = input;

      try {
        const { status } = await auth.api.setUserPassword({
          body: {
            newPassword,
            userId,
          },
          headers: await headers(),
        });

        if (!status) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to change password",
          });
        }

        if (revokeAllSessions) {
          const { success } = await auth.api.revokeUserSessions({
            body: {
              userId,
            },
            headers: await headers(),
          });

          if (!success) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Failed to revoke sessions",
            });
          }
        }

        return true;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to change password",
          cause: error,
        });
      }
    }),

  /**
   * Deletes a user
   * @param id - The ID of the user to delete
   * @returns Promise<boolean> - Result of the delete operation
   */
  delete: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    try {
      if (ctx.session.user.id === input) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account",
        });
      }

      const cookieStore = await cookies();
      const response = await polarClient.customers.deleteExternal({
        externalId: input,
      });

      // Delete all cookies
      cookieStore.getAll().forEach((cookie) => {
        cookieStore.delete(cookie.name);
      });

      return response;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete customer",
        cause: error,
      });
    }
  }),
});
