import { and, count, desc, eq, ilike, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { activityLog, activityLogTypeValues, user } from "@workspace/drizzle/schema";

export const logsRouter = createTRPCRouter({
  tableSize: adminProcedure.query(async () => {
    const result = await db.execute(
      sql`SELECT pg_total_relation_size('activity_log') as size_bytes`
    );
    return { sizeBytes: Number(result.rows[0].size_bytes) };
  }),

  get: adminProcedure.input(z.string()).query(async ({ input }) => {
    return db
      .select()
      .from(activityLog)
      .where(eq(activityLog.id, input))
      .limit(1)
      .then((result) => result[0] ?? null);
  }),

  list: adminProcedure
    .input(
      z.object({
        page: z.number().optional(),
        limit: z.number().optional(),
        type: z.enum(activityLogTypeValues).optional(),
        status: z.enum(["success", "failed"]).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, type, status, search } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (type) conditions.push(eq(activityLog.type, type));
      if (status) conditions.push(eq(activityLog.status, status));
      if (search) conditions.push(ilike(activityLog.summary, `%${search}%`));

      return db
        .select({
          id: activityLog.id,
          type: activityLog.type,
          status: activityLog.status,
          userId: activityLog.userId,
          actor: activityLog.actor,
          summary: activityLog.summary,
          metadata: activityLog.metadata,
          error: activityLog.error,
          createdAt: activityLog.createdAt,
          userImage: user.image,
          userName: user.name,
        })
        .from(activityLog)
        .leftJoin(user, eq(activityLog.userId, user.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(activityLog.createdAt))
        .limit(limit)
        .offset(offset);
    }),

  count: adminProcedure
    .input(
      z
        .object({
          type: z.enum(activityLogTypeValues).optional(),
          status: z.enum(["success", "failed"]).optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input?.type) conditions.push(eq(activityLog.type, input.type));
      if (input?.status) conditions.push(eq(activityLog.status, input.status));
      if (input?.search)
        conditions.push(ilike(activityLog.summary, `%${input.search}%`));

      return db
        .select({ count: count() })
        .from(activityLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
    await db.delete(activityLog).where(eq(activityLog.id, input));
    return { success: true };
  }),

  purgePreview: adminProcedure.query(async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const breakdown = await db
      .select({
        type: activityLog.type,
        status: activityLog.status,
        count: count(),
        oldest: sql<string>`min(${activityLog.createdAt})`,
      })
      .from(activityLog)
      .where(lt(activityLog.createdAt, thirtyDaysAgo))
      .groupBy(activityLog.type, activityLog.status);

    const total = breakdown.reduce((sum, row) => sum + row.count, 0);

    return { total, breakdown };
  }),

  purge: adminProcedure.mutation(async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await db
      .delete(activityLog)
      .where(lt(activityLog.createdAt, thirtyDaysAgo))
      .returning({ id: activityLog.id });

    return { deleted: result.length };
  }),
});
