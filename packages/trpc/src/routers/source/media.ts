import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { sourceMedia } from "@workspace/drizzle/schema";

export const sourceMediaRouter = createTRPCRouter({
  create: adminProcedure
    .input(
      z.object({
        sourceId: z.string(),
        type: z.enum(["image", "video"]),
        theme: z.enum(["light", "dark"]).optional(),
        url: z.string(),
        alt: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const [media] = await db.insert(sourceMedia).values(input).returning();
        if (!media) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create media",
          });
        }
        return media;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create media",
          cause: error,
        });
      }
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.enum(["image", "video"]).optional(),
        theme: z.enum(["light", "dark"]).nullish(),
        url: z.string().optional(),
        alt: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, ...data } = input;
        const [media] = await db
          .update(sourceMedia)
          .set(data)
          .where(eq(sourceMedia.id, id))
          .returning();

        if (!media) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }
        return media;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to update media",
          cause: error,
        });
      }
    }),
  delete: adminProcedure.input(z.string()).mutation(async ({ input: id }) => {
    try {
      const [deleted] = await db
        .delete(sourceMedia)
        .where(eq(sourceMedia.id, id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }
      return deleted;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete media",
        cause: error,
      });
    }
  }),
});
