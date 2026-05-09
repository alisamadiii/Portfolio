import { cookies, headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ilike, isNotNull, or } from "drizzle-orm";
import z from "zod";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { subscriptions, user } from "@workspace/drizzle/schema";

import {
  adminProcedure,
  authenticatedProcedure,
  createTRPCRouter,
} from "../init";

export const usersRouter = createTRPCRouter({
  // ─── Authenticated ─────────────────────────────────────────────

  getCurrent: authenticatedProcedure.query(async ({ ctx }) => {
    return ctx.session;
  }),

  getSession: authenticatedProcedure.query(async ({ ctx }) => {
    return ctx.session.user;
  }),

  update: authenticatedProcedure
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
            return Object.keys(data).length > 0;
          },
          {
            message: "At least one field must be provided for update",
          }
        )
        .strict()
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

  // ─── Admin ─────────────────────────────────────────────────────

  get: adminProcedure.input(z.string()).query(async ({ input }) => {
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

  list: adminProcedure
    .input(
      z.object({
        page: z.number().optional(),
        limit: z.number().optional(),
        sortBy: z
          .enum(["email", "created", "banned", "notifications"])
          .optional(),
        search: z.string().optional(),
        filterBy: z
          .enum(["all", "admin", "hasStripeCustomer"])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { page = 1, limit = 10, sortBy, search, filterBy } = input;

        const offset = (page - 1) * limit;

        const conditions = [];

        if (search) {
          conditions.push(
            or(
              ilike(user.email, `%${search}%`),
              ilike(user.name, `%${search}%`)
            )
          );
        }

        if (filterBy === "admin") {
          conditions.push(eq(user.role, "admin"));
        } else if (filterBy === "hasStripeCustomer") {
          conditions.push(isNotNull(user.stripeCustomerId));
        }

        const where =
          conditions.length > 0 ? and(...conditions) : undefined;

        const users = await db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: user.role,
            banned: user.banned,
            banReason: user.banReason,
            banExpires: user.banExpires,
            metadata: user.metadata,
            phone: user.phone,
            company: user.company,
            address: user.address,
          })
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
          .where(where);

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

  count: adminProcedure
    .input(
      z
        .object({
          filterBy: z
            .enum(["all", "admin", "hasStripeCustomer"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const filterBy = input?.filterBy;

        const where =
          filterBy === "admin"
            ? eq(user.role, "admin")
            : filterBy === "hasStripeCustomer"
              ? isNotNull(user.stripeCustomerId)
              : undefined;

        const countResult = await db
          .select({ count: count() })
          .from(user)
          .where(where);
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

  adminUpdate: adminProcedure
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
          stripeCustomerId: z.string().nullable().optional(),
        })
        .refine(
          (data) => {
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

  delete: adminProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    try {
      if (ctx.session.user.id === input) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account",
        });
      }

      const dbUser = await db
        .select()
        .from(user)
        .where(eq(user.id, input))
        .limit(1)
        .then((res) => res[0]);

      await db.delete(user).where(eq(user.id, input));

      const cookieStore = await cookies();
      cookieStore.getAll().forEach((cookie) => {
        cookieStore.delete(cookie.name);
      });

      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete customer",
        cause: error,
      });
    }
  }),

  // ─── Clients (Admin) ───────────────────────────────────────────

  getClients: adminProcedure.query(async () => {
    try {
      const rows = await db
        .select({
          id: subscriptions.id,
          status: subscriptions.status,
          amount: subscriptions.amount,
          currency: subscriptions.currency,
          recurringInterval: subscriptions.recurringInterval,
          productId: subscriptions.productId,
          cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
          startedAt: subscriptions.startedAt,
          canceledAt: subscriptions.canceledAt,
          userId: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          company: user.company,
        })
        .from(subscriptions)
        .leftJoin(user, eq(subscriptions.userId, user.id))
        .orderBy(desc(subscriptions.createdAt));

      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        name: row.name ?? null,
        email: row.email ?? "",
        image: row.image ?? null,
        company: row.company ?? null,
        status: row.status,
        amount: row.amount,
        currency: row.currency,
        recurringInterval: row.recurringInterval,
        productId: row.productId,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        startedAt: row.startedAt,
        canceledAt: row.canceledAt,
      }));
    } catch (error: unknown) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch clients",
      });
    }
  }),

  getClientDetail: adminProcedure.input(z.string()).query(async ({ input }) => {
    try {
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, input))
        .limit(1);

      if (!userRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const subs = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, input))
        .orderBy(desc(subscriptions.createdAt));

      return {
        user: userRecord,
        subscriptions: subs,
      };
    } catch (error: unknown) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch client detail",
      });
    }
  }),

  updateMetadata: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        metadata: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const [updated] = await db
          .update(user)
          .set({ metadata: input.metadata })
          .where(eq(user.id, input.userId))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        return updated;
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update metadata",
        });
      }
    }),
});
