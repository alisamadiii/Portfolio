import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import z from "zod";

import {
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { orders, source, sourceFile } from "@workspace/drizzle/schema";
import type { ProjectType } from "@workspace/drizzle/schema";

async function hasUserPurchasedProject(
  userId: string,
  project: ProjectType
): Promise<boolean> {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.status, "paid"),
        sql`${orders.metadata}->>'project' = ${project}`
      )
    )
    .limit(1);

  return !!row;
}

export const motionRouter = createTRPCRouter({
  getFiles: baseProcedure
    .input(
      z.object({
        sourceId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const [getSource] = await db
          .select({ isPrivate: source.isPrivate })
          .from(source)
          .where(eq(source.id, input.sourceId));

        if (!getSource) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Source not found",
          });
        }

        const isPrivate = getSource.isPrivate;

        if (!isPrivate) {
          const files = await db
            .select()
            .from(sourceFile)
            .where(eq(sourceFile.sourceId, input.sourceId));

          return files;
        }

        const session = await auth.api.getSession({
          headers: await headers(),
        });

        const hasPurchased = session
          ? await hasUserPurchasedProject(session.user.id, "MOTION")
          : false;

        const files = await db
          .select()
          .from(sourceFile)
          .where(eq(sourceFile.sourceId, input.sourceId));

        if (!hasPurchased) {
          return files.map((file) =>
            isPrivate
              ? {
                  ...file,
                  content: null,
                  preview:
                    typeof file.content === "string"
                      ? file.content.split("\n").slice(0, 16).join("\n")
                      : null,
                }
              : file
          );
        }

        return files;
      } catch (error) {
        throw new TRPCError({
          code:
            error instanceof TRPCError ? error.code : "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch files",
          cause: error,
        });
      }
    }),
  isUserPurchased: authenticatedProcedure.query(async ({ ctx }) => {
    return hasUserPurchasedProject(ctx.session.user.id, "MOTION");
  }),
});
