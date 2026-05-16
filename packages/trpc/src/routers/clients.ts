import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { clientScopes, user } from "@workspace/drizzle/schema";

export const clientsRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    const rows = await db
      .select({
        id: user.id,
        createdAt: user.createdAt,
        name: user.name,
        email: user.email,
        image: user.image,
        company: user.company,
        stripeCustomerId: user.stripeCustomerId,
        scopeCount: sql<number>`(select count(*) from client_scopes where client_scopes.user_id = "user".id)`.as(
          "scope_count"
        ),
        subscriptionCount: sql<number>`(select count(*) from subscription where subscription.user_id = "user".id)`.as(
          "subscription_count"
        ),
      })
      .from(user)
      .where(eq(user.isClient, true))
      .orderBy(desc(user.createdAt));

    return rows.map((row) => ({
      id: row.id,
      userId: row.id,
      createdAt: row.createdAt,
      name: row.name ?? "",
      email: row.email ?? "",
      image: row.image ?? null,
      company: row.company ?? null,
      stripeCustomerId: row.stripeCustomerId ?? null,
      scopeCount: Number(row.scopeCount),
      subscriptionCount: Number(row.subscriptionCount),
    }));
  }),

  get: adminProcedure.input(z.string()).query(async ({ input }) => {
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, input))
      .limit(1);

    if (!userRecord || !userRecord.isClient) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
    }

    const scopes = await db
      .select()
      .from(clientScopes)
      .where(eq(clientScopes.userId, input))
      .orderBy(desc(clientScopes.createdAt));

    return {
      user: userRecord,
      scopes,
    };
  }),

  create: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(user)
        .set({ isClient: true, updatedAt: new Date() })
        .where(eq(user.id, input.userId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return updated;
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
    const [updated] = await db
      .update(user)
      .set({ isClient: false, updatedAt: new Date() })
      .where(eq(user.id, input))
      .returning();

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
    }

    return { success: true };
  }),
});
