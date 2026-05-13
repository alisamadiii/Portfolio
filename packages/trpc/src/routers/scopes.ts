import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import {
  clientScopes,
  scopeTypeValues,
  type ScopeMetadata,
  type ScopeType,
} from "@workspace/drizzle/schema";

// ─── Type-Safe Metadata Schemas ─────────────────────────────────

const contactMetadataSchema = z.object({
  domain: z.string().min(1),
  email: z.string().email(),
  description: z.string().optional(),
});

const scopeMetadataSchemas = {
  contact: contactMetadataSchema,
} satisfies Record<ScopeType, z.ZodSchema>;

// ─── Helpers ────────────────────────────────────────────────────

const validateMetadata = (type: ScopeType, metadata: unknown): ScopeMetadata => {
  const schema = scopeMetadataSchemas[type];
  const result = schema.safeParse(metadata);
  if (!result.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid metadata for scope type "${type}": ${result.error.issues.map((i) => i.message).join(", ")}`,
    });
  }
  return result.data as ScopeMetadata;
};

// ─── Router ─────────────────────────────────────────────────────

export const scopesRouter = createTRPCRouter({
  listByClient: adminProcedure.input(z.string()).query(async ({ input }) => {
    return db
      .select()
      .from(clientScopes)
      .where(eq(clientScopes.clientId, input))
      .orderBy(desc(clientScopes.createdAt));
  }),

  create: adminProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        type: z.enum(scopeTypeValues),
        metadata: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ input }) => {
      const validated = validateMetadata(input.type, input.metadata);

      const [record] = await db
        .insert(clientScopes)
        .values({
          clientId: input.clientId,
          type: input.type,
          metadata: validated,
        })
        .returning();

      return record;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, metadata, isActive } = input;

      // If metadata provided, need to know the type to validate
      let validatedMetadata: ScopeMetadata | undefined;
      if (metadata) {
        const [existing] = await db
          .select({ type: clientScopes.type })
          .from(clientScopes)
          .where(eq(clientScopes.id, id))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scope not found",
          });
        }

        validatedMetadata = validateMetadata(existing.type, metadata);
      }

      const [updated] = await db
        .update(clientScopes)
        .set({
          ...(validatedMetadata ? { metadata: validatedMetadata } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(clientScopes.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scope not found" });
      }

      return updated;
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
    const [deleted] = await db
      .delete(clientScopes)
      .where(eq(clientScopes.id, input))
      .returning();

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Scope not found" });
    }

    return { success: true };
  }),

  resetUsageCount: adminProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(clientScopes)
        .set({ usageCount: 0, updatedAt: new Date() })
        .where(eq(clientScopes.id, input))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scope not found" });
      }

      return updated;
    }),
});
