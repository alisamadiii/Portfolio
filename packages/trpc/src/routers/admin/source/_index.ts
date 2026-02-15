import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import z from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { source, sourceFile } from "@workspace/drizzle/schema";

import { sourceFileRouter } from "./file";

export const adminSourcesRouter = createTRPCRouter({
  read: adminProcedure.query(async () => {
    try {
      const rows = await db
        .select()
        .from(source)
        .leftJoin(sourceFile, eq(source.id, sourceFile.sourceId))
        .orderBy(asc(source.isPrivate), desc(source.createdAt));

      // Group results by source
      const sourcesMap = new Map<
        string,
        {
          source: (typeof rows)[0]["source"];
          files: NonNullable<(typeof rows)[0]["source_file"]>[];
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
        } else {
          sourcesMap.set(row.source.id, {
            source: row.source,
            files: row.source_file ? [row.source_file] : [],
          });
        }
      }

      return Array.from(sourcesMap.values()).map(({ source, files }) => ({
        ...source,
        files,
      }));
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
        .where(eq(source.id, id));

      if (rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source not found",
        });
      }

      const files: (typeof sourceFile.$inferSelect)[] = [];

      for (const row of rows) {
        if (
          row.source_file &&
          !files.some((f) => f.id === row.source_file!.id)
        ) {
          files.push(row.source_file);
        }
      }

      return {
        ...rows[0]!.source,
        files,
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
        imageUrl: z.string().optional(),
        darkImageUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        darkVideoUrl: z.string().optional(),
        from: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(source)
          .set(data)
          .where(eq(source.id, id))
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
  file: sourceFileRouter,
});
