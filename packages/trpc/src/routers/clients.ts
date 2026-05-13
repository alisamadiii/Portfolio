import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import {
  clients,
  clientScopes,
  contactSubmissions,
  user,
} from "@workspace/drizzle/schema";

export const clientsRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    const rows = await db
      .select({
        id: clients.id,
        userId: clients.userId,
        createdAt: clients.createdAt,
        name: user.name,
        email: user.email,
        image: user.image,
        company: user.company,
        stripeCustomerId: user.stripeCustomerId,
        scopeCount: sql<number>`(select count(*) from client_scopes where client_scopes.client_id = clients.id)`.as("scope_count"),
        submissionCount: sql<number>`(select count(*) from contact_submissions where contact_submissions.user_id = clients.user_id)`.as("submission_count"),
        subscriptionCount: sql<number>`(select count(*) from subscription where subscription.user_id = clients.user_id)`.as("subscription_count"),
      })
      .from(clients)
      .leftJoin(user, eq(clients.userId, user.id))
      .orderBy(desc(clients.createdAt));

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      createdAt: row.createdAt,
      name: row.name ?? "",
      email: row.email ?? "",
      image: row.image ?? null,
      company: row.company ?? null,
      stripeCustomerId: row.stripeCustomerId ?? null,
      scopeCount: Number(row.scopeCount),
      submissionCount: Number(row.submissionCount),
      subscriptionCount: Number(row.subscriptionCount),
    }));
  }),

  get: adminProcedure.input(z.string()).query(async ({ input }) => {
    const [clientRow] = await db
      .select({
        id: clients.id,
        userId: clients.userId,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .where(eq(clients.id, input))
      .limit(1);

    if (!clientRow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
    }

    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, clientRow.userId))
      .limit(1);

    if (!userRecord) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const scopes = await db
      .select()
      .from(clientScopes)
      .where(eq(clientScopes.clientId, input))
      .orderBy(desc(clientScopes.createdAt));

    const submissions = await db
      .select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.userId, clientRow.userId))
      .orderBy(desc(contactSubmissions.createdAt));

    return {
      client: clientRow,
      user: userRecord,
      scopes,
      contactSubmissions: submissions,
    };
  }),

  create: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const [client] = await db
        .insert(clients)
        .values({ userId: input.userId })
        .returning();

      return client;
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
    const [deleted] = await db
      .delete(clients)
      .where(eq(clients.id, input))
      .returning();

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
    }

    return { success: true };
  }),
});
