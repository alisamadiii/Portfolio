import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { session } from "@workspace/drizzle/schema";

import {
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "../init";

export const authRouter = createTRPCRouter({
  getSessions: baseProcedure.input(z.string()).query(async ({ input }) => {
    try {
      const userId = input;

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
    .mutation(async ({ input }) => {
      try {
        const sessionId = input;
        await db.delete(session).where(eq(session.id, sessionId));
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
