import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import z from "zod";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { session } from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../init";
import { isAdminUser } from "../lib/authz-shared";

export const authRouter = createTRPCRouter({
  getSessions: authenticatedProcedure
    .input(z.string().optional())
    .query(async ({ input, ctx }) => {
      try {
        // Non-admins can only list their own sessions; admins (user pages) may
        // pass a target userId.
        const userId =
          isAdminUser(ctx.session.user) && input
            ? input
            : ctx.session.user.id;

        const sessions = await auth.api
        .listUserSessions({
          body: {
            userId,
          },
          headers: await headers(),
        })
        .then((res) =>
          res.sessions.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          )
        );

      return sessions;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch sessions",
        cause: error,
      });
    }
  }),

  revokeSession: authenticatedProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      try {
        const sessionId = input;
        // Non-admins may only revoke their own sessions; admins (user devices
        // page) may revoke any session by id.
        await db
          .delete(session)
          .where(
            isAdminUser(ctx.session.user)
              ? eq(session.id, sessionId)
              : and(
                  eq(session.id, sessionId),
                  eq(session.userId, ctx.session.user.id)
                )
          );
        return true;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to revoke session",
          cause: error,
        });
      }
    }),
});
