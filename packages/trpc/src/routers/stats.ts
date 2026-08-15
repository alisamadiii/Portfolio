import { and, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import {
  orders,
  products,
  source,
  subscriptions,
  user,
} from "@workspace/drizzle/schema";

import { adminProcedure, createTRPCRouter } from "../init";

export const statsRouter = createTRPCRouter({
  overview: adminProcedure.query(async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [usersTotal, usersRecent, ordersAgg, subsActive, sourcesTotal] =
      await Promise.all([
        db.select({ count: count() }).from(user),
        db
          .select({ count: count() })
          .from(user)
          .where(gte(user.createdAt, thirtyDaysAgo)),
        db
          .select({ count: count(), revenue: sum(orders.totalAmount) })
          .from(orders)
          .where(eq(orders.status, "paid")),
        db
          .select({ count: count() })
          .from(subscriptions)
          .where(eq(subscriptions.status, "active")),
        db.select({ count: count() }).from(source),
      ]);

    return {
      users: {
        total: usersTotal[0]?.count ?? 0,
        last30d: usersRecent[0]?.count ?? 0,
      },
      orders: {
        paidCount: ordersAgg[0]?.count ?? 0,
        paidRevenue: Number(ordersAgg[0]?.revenue ?? 0),
      },
      subscriptions: {
        active: subsActive[0]?.count ?? 0,
      },
      sources: {
        total: sourcesTotal[0]?.count ?? 0,
      },
    };
  }),

  /** Paid revenue per month for the last 12 months, oldest first, zero-filled. */
  revenueByMonth: adminProcedure.query(async () => {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCMonth(start.getUTCMonth() - 11);

    const month = sql<string>`date_trunc('month', ${orders.createdAt})`;
    const rows = await db
      .select({ month, revenue: sum(orders.totalAmount) })
      .from(orders)
      .where(and(eq(orders.status, "paid"), gte(orders.createdAt, start)))
      .groupBy(month);

    const byMonth = new Map(
      rows.map((r) => [new Date(r.month).toISOString().slice(0, 7), Number(r.revenue ?? 0)])
    );

    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(start);
      d.setUTCMonth(d.getUTCMonth() + i);
      const key = d.toISOString().slice(0, 7);
      return { month: key, revenue: byMonth.get(key) ?? 0 };
    });
  }),

  recentOrders: adminProcedure
    .input(
      z
        .object({ limit: z.number().min(1).max(20).default(8) })
        .optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 8;

      const rows = await db
        .select({
          id: orders.id,
          email: orders.email,
          billingName: orders.billingName,
          productId: orders.productId,
          totalAmount: orders.totalAmount,
          status: orders.status,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(limit);

      if (rows.length === 0) return [];

      // orders.productId is text while products.id is uuid, so resolve
      // names in JS instead of a cast-heavy join.
      const productRows = await db
        .select({ id: products.id, name: products.name })
        .from(products);
      const nameById = new Map(productRows.map((p) => [p.id, p.name]));

      return rows.map((row) => ({
        ...row,
        productName: nameById.get(row.productId) ?? null,
      }));
    }),
});
