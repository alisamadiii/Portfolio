import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import z from "zod";

import {
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { invoices, source, sourceFile } from "@workspace/drizzle/schema";
import { getProductIdByProject } from "@workspace/trpc/lib/product-helpers";

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

        const motionProductId = await getProductIdByProject("MOTION");

        if (!motionProductId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No Motion product found",
          });
        }

        const session = await auth.api.getSession({
          headers: await headers(),
        });

        if (!session) {
          const files = await db
            .select()
            .from(sourceFile)
            .where(eq(sourceFile.sourceId, input.sourceId));

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

        const findMotionOrder = await db
          .select()
          .from(invoices)
          .where(
            and(
              eq(invoices.userId, session.user.id),
              eq(invoices.productId, motionProductId),
              eq(invoices.status, "paid")
            )
          );

        if (findMotionOrder.length === 0) {
          const files = await db
            .select()
            .from(sourceFile)
            .where(eq(sourceFile.sourceId, input.sourceId));

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

        const files = await db
          .select()
          .from(sourceFile)
          .where(eq(sourceFile.sourceId, input.sourceId));

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
    const motionProductId = await getProductIdByProject("MOTION");

    if (!motionProductId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No Motion product found",
      });
    }

    const findMotionOrder = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, ctx.session.user.id),
          eq(invoices.productId, motionProductId),
          eq(invoices.status, "paid")
        )
      );

    return findMotionOrder.length > 0 ? true : false;
  }),
});
