import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import {
  agencyClient,
  agencyClientStatusValues,
  user,
} from "@workspace/drizzle/schema";

export const clientsRouter = createTRPCRouter({
  getCurrent: authenticatedProcedure.query(async ({ ctx }) => {
    const [record] = await db
      .select()
      .from(agencyClient)
      .where(eq(agencyClient.userId, ctx.session.user.id))
      .limit(1);
    return record ?? null;
  }),

  list: adminProcedure.query(async () => {
    const rows = await db
      .select({
        id: agencyClient.id,
        userId: agencyClient.userId,
        isStripe: agencyClient.isStripe,
        domain: agencyClient.domain,
        status: agencyClient.status,
        createdAt: agencyClient.createdAt,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
        userCompany: user.company,
        subscriptionCount:
          sql<number>`(select count(*) from subscription where subscription.user_id = ${agencyClient.userId})`.as(
            "subscription_count"
          ),
      })
      .from(agencyClient)
      .innerJoin(user, eq(user.id, agencyClient.userId))
      .orderBy(desc(agencyClient.createdAt));

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      createdAt: row.createdAt,
      name: row.userName ?? "",
      email: row.userEmail ?? "",
      image: row.userImage ?? null,
      company: row.userCompany ?? null,
      isStripe: row.isStripe,
      domain: row.domain ?? null,
      status: row.status,
      subscriptionCount: Number(row.subscriptionCount),
    }));
  }),

  get: adminProcedure.input(z.string()).query(async ({ input }) => {
    // Input can be agencyClient.id or userId
    const [record] = await db
      .select()
      .from(agencyClient)
      .innerJoin(user, eq(user.id, agencyClient.userId))
      .where(eq(agencyClient.userId, input))
      .limit(1);

    if (!record) {
      // Try by agencyClient.id
      const [byId] = await db
        .select()
        .from(agencyClient)
        .innerJoin(user, eq(user.id, agencyClient.userId))
        .where(eq(agencyClient.id, input))
        .limit(1);

      if (!byId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return { user: byId.user, client: byId.agency_client };
    }

    return { user: record.user, client: record.agency_client };
  }),

  create: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      // Check user exists
      const [existingUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!existingUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Check not already a client
      const [existing] = await db
        .select({ id: agencyClient.id })
        .from(agencyClient)
        .where(eq(agencyClient.userId, input.userId))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already an agency client",
        });
      }

      const [record] = await db
        .insert(agencyClient)
        .values({ userId: input.userId })
        .returning();

      return record;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        isStripe: z.boolean().optional(),
        domain: z.string().nullable().optional(),
        projectRepo: z.string().nullable().optional(),
        clickupListId: z.string().nullable().optional(),
        figmaUrl: z.string().nullable().optional(),
        techStack: z.string().nullable().optional(),
        launchDate: z.string().nullable().optional(),
        timezone: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        contactEmail: z.string().email().nullable().optional(),
        apiKeyOrigin: z.string().nullable().optional(),
        status: z.enum(agencyClientStatusValues).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db
        .update(agencyClient)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(agencyClient.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return updated;
    }),

  generateApiKey: adminProcedure
    .input(z.string())
    .mutation(async ({ input: clientId }) => {
      const key = `ak_${crypto.randomUUID().replace(/-/g, "")}`;

      const [updated] = await db
        .update(agencyClient)
        .set({ apiKey: key, updatedAt: new Date() })
        .where(eq(agencyClient.id, clientId))
        .returning({ apiKey: agencyClient.apiKey });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return { apiKey: updated.apiKey };
    }),

  revokeApiKey: adminProcedure
    .input(z.string())
    .mutation(async ({ input: clientId }) => {
      const [updated] = await db
        .update(agencyClient)
        .set({ apiKey: null, updatedAt: new Date() })
        .where(eq(agencyClient.id, clientId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return { success: true };
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
    const [deleted] = await db
      .delete(agencyClient)
      .where(eq(agencyClient.id, input))
      .returning();

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
    }

    return { success: true };
  }),
});
