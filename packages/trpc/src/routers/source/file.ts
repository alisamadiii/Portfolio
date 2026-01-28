import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { sourceFile } from "@workspace/drizzle/schema";

export const sourceFileRouter = createTRPCRouter({
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
        isPrivate: z.boolean().optional(),
        index: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, ...data } = input;
        const [file] = await db
          .update(sourceFile)
          .set(data)
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
