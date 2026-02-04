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
import {
  orders,
  source,
  sourceFile,
  sourceMedia,
} from "@workspace/drizzle/schema";

export const motionRouter = createTRPCRouter({
  getFiles: baseProcedure
    .input(
      z.object({
        sourceId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        // Check if the source is private
        const [getSource] = await db
          .select({ isPrivate: source.isPrivate })
          .from(source)
          .where(eq(source.id, input.sourceId));

        const isPrivate = getSource.isPrivate;

        console.log({ isPrivate });

        if (!isPrivate) {
          const files = await db
            .select()
            .from(sourceFile)
            .where(eq(sourceFile.sourceId, input.sourceId));

          return files;
        }

        const motionProductId = process.env.NEXT_PUBLIC_MOTION_PRODUCT;

        if (!motionProductId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Motion product ID is not set",
          });
        }

        // Check if the user is authenticated
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

        // Check if the user has access to the motion product
        const findMotionOrder = await db
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.userId, session.user.id),
              eq(orders.productId, motionProductId),
              eq(orders.status, "paid")
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
    const motionProductId = process.env.NEXT_PUBLIC_MOTION_PRODUCT;

    if (!motionProductId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Motion product ID is not set",
      });
    }

    const findMotionOrder = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, ctx.session.user.id),
          eq(orders.productId, motionProductId),
          eq(orders.status, "paid")
        )
      );

    return findMotionOrder.length > 0 ? true : false;
  }),
  getCodesScript: baseProcedure.query(async () => {
    const rows = await db
      .select({
        source,
        file: sourceFile,
        media: sourceMedia,
      })
      .from(source)
      .leftJoin(sourceFile, eq(sourceFile.sourceId, source.id))
      .leftJoin(sourceMedia, eq(sourceMedia.sourceId, source.id));

    const filesBySourceId = new Map<
      string,
      (typeof sourceFile.$inferSelect)[]
    >();
    const mediaBySourceId = new Map<
      string,
      (typeof sourceMedia.$inferSelect)[]
    >();
    const sourcesOrder: (typeof source.$inferSelect)[] = [];
    const seenSourceIds = new Set<string>();
    const seenFileIds = new Map<string, Set<string>>();
    const seenMediaIds = new Map<string, Set<string>>();

    for (const row of rows) {
      const id = row.source.id;
      if (!seenSourceIds.has(id)) {
        seenSourceIds.add(id);
        sourcesOrder.push(row.source);
        seenFileIds.set(id, new Set());
        seenMediaIds.set(id, new Set());
      }
      if (row.file && !seenFileIds.get(id)!.has(row.file.id)) {
        seenFileIds.get(id)!.add(row.file.id);
        if (!filesBySourceId.has(id)) filesBySourceId.set(id, []);
        filesBySourceId.get(id)!.push(row.file);
      }
      if (row.media && !seenMediaIds.get(id)!.has(row.media.id)) {
        seenMediaIds.get(id)!.add(row.media.id);
        if (!mediaBySourceId.has(id)) mediaBySourceId.set(id, []);
        mediaBySourceId.get(id)!.push(row.media);
      }
    }

    return sourcesOrder.map((s) => ({
      ...s,
      files: filesBySourceId.get(s.id) ?? [],
      media: mediaBySourceId.get(s.id) ?? [],
    }));
  }),
});
