import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { source, sourceFile, sourceMedia } from "@workspace/drizzle/schema";

import { sourceFileRouter } from "./file";
import { sourceMediaRouter } from "./media";

export const adminSourcesRouter = createTRPCRouter({
  read: adminProcedure.query(async () => {
    try {
      const rows = await db
        .select()
        .from(source)
        .leftJoin(sourceFile, eq(source.id, sourceFile.sourceId))
        .leftJoin(sourceMedia, eq(source.id, sourceMedia.sourceId));

      // Group results by source
      const sourcesMap = new Map<
        string,
        {
          source: (typeof rows)[0]["source"];
          files: NonNullable<(typeof rows)[0]["source_file"]>[];
          media: NonNullable<(typeof rows)[0]["source_media"]>[];
        }
      >();

      for (const row of rows) {
        const existing = sourcesMap.get(row.source.id);

        if (existing) {
          if (
            row.source_file &&
            !existing.files.some((f) => f.id === row.source_file!.id)
          ) {
            existing.files.push(row.source_file);
          }
          if (
            row.source_media &&
            !existing.media.some((m) => m.id === row.source_media!.id)
          ) {
            existing.media.push(row.source_media);
          }
        } else {
          sourcesMap.set(row.source.id, {
            source: row.source,
            files: row.source_file ? [row.source_file] : [],
            media: row.source_media ? [row.source_media] : [],
          });
        }
      }

      return Array.from(sourcesMap.values()).map(
        ({ source, files, media }) => ({
          ...source,
          files,
          media,
        })
      );
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to read source",
        cause: error,
      });
    }
  }),
  readById: adminProcedure.input(z.string()).query(async ({ input: id }) => {
    try {
      const rows = await db
        .select()
        .from(source)
        .leftJoin(sourceFile, eq(source.id, sourceFile.sourceId))
        .leftJoin(sourceMedia, eq(source.id, sourceMedia.sourceId))
        .where(eq(source.id, id));

      if (rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source not found",
        });
      }

      const files: (typeof sourceFile.$inferSelect)[] = [];
      const media: (typeof sourceMedia.$inferSelect)[] = [];

      for (const row of rows) {
        if (
          row.source_file &&
          !files.some((f) => f.id === row.source_file!.id)
        ) {
          files.push(row.source_file);
        }
        if (
          row.source_media &&
          !media.some((m) => m.id === row.source_media!.id)
        ) {
          media.push(row.source_media);
        }
      }

      return {
        ...rows[0]!.source,
        files,
        media,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to read source",
        cause: error,
      });
    }
  }),
  create: adminProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const [newSource] = await db.insert(source).values(input).returning();
        if (!newSource) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create source",
          });
        }

        return newSource;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create source",
          cause: error,
        });
      }
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        isPrivate: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const [updated] = await db
          .update(source)
          .set({
            title: input.title,
            description: input.description,
            isPrivate: input.isPrivate,
          })
          .where(eq(source.id, input.id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Source not found",
          });
        }

        return updated;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to update source",
          cause: error,
        });
      }
    }),
  media: sourceMediaRouter,
  file: sourceFileRouter,
});
