import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { subscriptions, user } from "@workspace/drizzle/schema";

import type { AgencyMetadata } from "./products";

function parseServices(metadata: AgencyMetadata | undefined) {
  const raw = metadata?.services;
  if (!raw) return [];
  try {
    return JSON.parse(raw) as { name: string; price: number }[];
  } catch {
    return [];
  }
}

export const adminAgencyClientsRouter = createTRPCRouter({
  /** All agency subscriptions with client info. */
  getAll: adminProcedure.query(async () => {
    try {
      const rows = await db
        .select({
          id: subscriptions.id,
          status: subscriptions.status,
          amount: subscriptions.amount,
          currency: subscriptions.currency,
          recurringInterval: subscriptions.recurringInterval,
          metadata: subscriptions.metadata,
          productId: subscriptions.productId,
          cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
          startedAt: subscriptions.startedAt,
          canceledAt: subscriptions.canceledAt,
          createdAt: subscriptions.createdAt,
          // Client info from user table
          userId: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          company: user.company,
        })
        .from(subscriptions)
        .leftJoin(user, eq(subscriptions.userId, user.id))
        .where(sql`${subscriptions.metadata}->>'project' = 'AGENCY'`)
        .orderBy(desc(subscriptions.createdAt));

      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        name: row.name ?? null,
        email: row.email ?? "",
        image: row.image ?? null,
        company: row.company ?? null,
        status: row.status,
        amount: row.amount,
        currency: row.currency,
        recurringInterval: row.recurringInterval,
        productId: row.productId,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        startedAt: row.startedAt,
        canceledAt: row.canceledAt,
        services: parseServices(row.metadata as AgencyMetadata | undefined),
        createdAt: row.createdAt,
      }));
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch clients",
      });
    }
  }),

  /** Full client detail: user record + all agency subscriptions. */
  getById: adminProcedure.input(z.string()).query(async ({ input }) => {
    try {
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, input))
        .limit(1);

      if (!userRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const subs = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, input),
            sql`${subscriptions.metadata}->>'project' = 'AGENCY'`
          )
        )
        .orderBy(desc(subscriptions.createdAt));

      const parsedSubs = subs.map((sub) => {
        const meta = sub.metadata as AgencyMetadata | undefined;
        return {
          ...sub,
          services: parseServices(meta),
          project: meta?.project,
        };
      });

      return {
        user: userRecord,
        subscriptions: parsedSubs,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch client detail",
      });
    }
  }),

  /** Replace user.metadata with the provided key-value map. */
  updateMetadata: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        metadata: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const [updated] = await db
          .update(user)
          .set({ metadata: input.metadata })
          .where(eq(user.id, input.userId))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        return updated;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update metadata",
        });
      }
    }),
});
