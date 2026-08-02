import { and, count, desc, eq, gte, max } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db/index.js";
import { emailLogs } from "../db/schema.js";
import { ApiError } from "../lib/errors.js";
import type { AppEnv } from "../middleware/auth.js";

// Per-user email usage for the admin dashboard. Mounted under /v1/admin, so
// requireAdmin covers it. The client-facing counterpart is GET /v1/emails,
// which only ever shows the calling key's own history — this route is how an
// admin sees someone else's.

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const emailLogsRoute = new Hono<AppEnv>();

// GET /?userId=<id>&limit=<n> → { stats, emails }. An unknown userId returns
// empty stats rather than a 404, same as the envs listing filter.
emailLogsRoute.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) {
    throw new ApiError(
      400,
      "MISSING_USERID_PARAM",
      "userId query parameter is required",
      "Call this endpoint as /v1/admin/email-logs?userId=<id>&limit=10."
    );
  }
  const limit = Math.min(
    Number(c.req.query("limit")) || DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const db = createDb(c.env);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [byTypeRows, [thisMonth], [latest], rows] = await Promise.all([
    db
      .select({ type: emailLogs.type, count: count() })
      .from(emailLogs)
      .where(eq(emailLogs.userId, userId))
      .groupBy(emailLogs.type),
    db
      .select({ count: count() })
      .from(emailLogs)
      .where(
        and(eq(emailLogs.userId, userId), gte(emailLogs.createdAt, startOfMonth))
      ),
    db
      .select({ lastSentAt: max(emailLogs.createdAt) })
      .from(emailLogs)
      .where(eq(emailLogs.userId, userId)),
    db
      .select({
        id: emailLogs.id,
        type: emailLogs.type,
        fromAddress: emailLogs.fromAddress,
        to: emailLogs.to,
        subject: emailLogs.subject,
        visitorEmail: emailLogs.visitorEmail,
        source: emailLogs.source,
        createdAt: emailLogs.createdAt,
      })
      .from(emailLogs)
      .where(eq(emailLogs.userId, userId))
      .orderBy(desc(emailLogs.createdAt))
      .limit(limit),
  ]);

  const byType = Object.fromEntries(byTypeRows.map((r) => [r.type, r.count]));
  const total = byTypeRows.reduce((sum, r) => sum + r.count, 0);

  return c.json({
    stats: {
      total,
      thisMonth: thisMonth?.count ?? 0,
      byType,
      lastSentAt: latest?.lastSentAt ?? null,
    },
    emails: rows,
  });
});
