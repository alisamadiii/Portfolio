import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { generateId } from "@workspace/ui/lib/utils";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { apiTokens } from "@workspace/drizzle/schema";

export const tokensRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    return db.select().from(apiTokens).orderBy(desc(apiTokens.createdAt));
  }),

  create: adminProcedure
    .input(
      z.object({
        description: z.string().min(1),
        clientEmail: z.string().email(),
        clientUserId: z.string().optional(),
        scopes: z.array(z.enum(["contact"])).min(1),
        expiresAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const token = generateId();

      const [record] = await db
        .insert(apiTokens)
        .values({
          token,
          description: input.description,
          clientEmail: input.clientEmail,
          clientUserId: input.clientUserId,
          scopes: input.scopes,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        })
        .returning();

      return record;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        clientEmail: z.string().email().optional(),
        clientUserId: z.string().optional(),
        scopes: z.array(z.enum(["contact"])).min(1).optional(),
        expiresAt: z.string().datetime().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db
        .update(apiTokens)
        .set({
          ...data,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : data.expiresAt === null ? null : undefined,
          updatedAt: new Date(),
        })
        .where(eq(apiTokens.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
      }

      return updated;
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
    const [deleted] = await db
      .delete(apiTokens)
      .where(eq(apiTokens.id, input))
      .returning();

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
    }

    return { success: true };
  }),

  resetUsageCount: adminProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(apiTokens)
        .set({ usageCount: 0, updatedAt: new Date() })
        .where(eq(apiTokens.id, input))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
      }

      return updated;
    }),
});
