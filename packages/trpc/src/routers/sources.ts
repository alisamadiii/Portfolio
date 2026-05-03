import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import z from "zod";

import {
  adminProcedure,
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

const sourceFileRouter = createTRPCRouter({
  create: adminProcedure
    .input(
      z.object({
        sourceId: z.string(),
        filename: z.string(),
        path: z.string().optional(),
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const [file] = await db.insert(sourceFile).values(input).returning();
        if (!file) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create file",
          });
        }
        return file;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create file",
          cause: error,
        });
      }
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        filename: z.string().optional(),
        path: z.string().optional(),
        content: z.string().optional(),
        index: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, filename, path, content, index } = input;
        const [file] = await db
          .update(sourceFile)
          .set({ filename, path, content, index })
          .where(eq(sourceFile.id, id))
          .returning();

        if (!file) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found",
          });
        }
        return file;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to update file",
          cause: error,
        });
      }
    }),
  delete: adminProcedure.input(z.string()).mutation(async ({ input: id }) => {
    try {
      const [deleted] = await db
        .delete(sourceFile)
        .where(eq(sourceFile.id, id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }
      return deleted;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete file",
        cause: error,
      });
    }
  }),
  reorder: adminProcedure
    .input(z.array(z.object({ id: z.string(), index: z.number() })))
    .mutation(async ({ input }) => {
      try {
        await Promise.all(
          input.map(({ id, index }) =>
            db.update(sourceFile).set({ index }).where(eq(sourceFile.id, id))
          )
        );
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to reorder files",
          cause: error,
        });
      }
    }),
});

export const sourcesRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    try {
      const rows = await db
        .select()
        .from(source)
        .leftJoin(sourceFile, eq(source.id, sourceFile.sourceId))
        .orderBy(asc(source.isPrivate), desc(source.createdAt));

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
  get: adminProcedure.input(z.string()).query(async ({ input: id }) => {
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
  // ─── Public (Motion) ────────────────────────────────────────────

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

  file: sourceFileRouter,
});
