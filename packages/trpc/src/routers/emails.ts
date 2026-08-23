import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { emailLogs, hubProject } from "@workspace/drizzle/schema";

import {
  authenticatedProcedure,
  cmsProcedure,
  createTRPCRouter,
} from "../init";
import { agency } from "../lib/agency";
import { resolveRepoId } from "../lib/cms/repo-id";
import { getToken } from "../lib/cms/token";

// Authorize a caller for a single email by id alone — resolves the email's
// project from its repoId and checks repo access. Powers the short /e/[id]
// link where owner/repo aren't in the URL. Throws NOT_FOUND (never leaks
// existence) for missing rows or callers without access.
async function authorizeEmailById(
  user: { id: string; email: string; role?: string | null },
  id: string
) {
  const [row] = await db
    .select({ ...publicColumns, repoId: emailLogs.repoId })
    .from(emailLogs)
    .where(eq(emailLogs.id, id))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
  }
  if (user.role === "admin") return row;

  if (row.repoId == null) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
  }
  const [project] = await db
    .select({ owner: hubProject.owner, repo: hubProject.repo })
    .from(hubProject)
    .where(eq(hubProject.repoId, row.repoId))
    .limit(1);
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
  }
  try {
    await getToken(user, project.owner, project.repo);
  } catch {
    throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
  }
  return row;
}

// r2Key and messageId are internal — they never leave the server, so every
// select picks columns explicitly instead of returning whole rows.
const publicColumns = {
  id: emailLogs.id,
  type: emailLogs.type,
  fromAddress: emailLogs.fromAddress,
  to: emailLogs.to,
  subject: emailLogs.subject,
  visitorEmail: emailLogs.visitorEmail,
  source: emailLogs.source,
  createdAt: emailLogs.createdAt,
};

// Emails are scoped per project (repo), not per user: every log carries the
// repoId stamped from the sender's api_client_settings at send time. The
// cmsProcedure gate already authorizes the caller's access to owner/repo.
export const emailsRouter = createTRPCRouter({
  list: cmsProcedure
    .input(
      z.object({
        // No superjson transformer — dates arrive as ISO strings.
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        search: z.string().trim().max(200).optional(),
        type: z.string().trim().max(100).optional(),
        page: z.number().int().min(0).default(0),
        // 10 for the table; the PDF export passes the max to grab everything.
        limit: z.number().int().min(1).max(5000).default(10),
      })
    )
    .query(async ({ input }) => {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const pattern = input.search ? `%${input.search}%` : null;
      const where = and(
        eq(emailLogs.repoId, repoId),
        input.from ? gte(emailLogs.createdAt, input.from) : undefined,
        input.to ? lte(emailLogs.createdAt, input.to) : undefined,
        input.type ? eq(emailLogs.type, input.type) : undefined,
        pattern
          ? or(
              ilike(emailLogs.subject, pattern),
              ilike(emailLogs.fromAddress, pattern),
              ilike(emailLogs.visitorEmail, pattern),
              sql`array_to_string(${emailLogs.to}, ' ') ilike ${pattern}`
            )
          : undefined
      );

      const { page, limit } = input;

      const [rows, [totalRow]] = await Promise.all([
        db
          .select(publicColumns)
          .from(emailLogs)
          .where(where)
          .orderBy(desc(emailLogs.createdAt))
          .limit(limit)
          .offset(page * limit),
        db.select({ total: count() }).from(emailLogs).where(where),
      ]);

      return {
        items: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
        total: totalRow?.total ?? 0,
      };
    }),

  // Daily counts + totals for the analytics section, over the same date range
  // as the table. Grouped in SQL; the client zero-fills days with no emails.
  stats: cmsProcedure
    .input(
      z.object({
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const where = and(
        eq(emailLogs.repoId, repoId),
        input.from ? gte(emailLogs.createdAt, input.from) : undefined,
        input.to ? lte(emailLogs.createdAt, input.to) : undefined
      );

      // `type` is free-form (senders pass "send", "newsletter", receipts, …),
      // so the outbound bucket is "everything that isn't a contact-form
      // message". That way sent + contact always equals the true total.
      const bucket = sql`date_trunc('day', ${emailLogs.createdAt})`;
      const daily = await db
        .select({
          date: sql<string>`to_char(${bucket}, 'YYYY-MM-DD')`,
          send: sql<number>`count(*) filter (where ${emailLogs.type} <> 'contact')`.mapWith(
            Number
          ),
          contact:
            sql<number>`count(*) filter (where ${emailLogs.type} = 'contact')`.mapWith(
              Number
            ),
        })
        .from(emailLogs)
        .where(where)
        .groupBy(bucket)
        .orderBy(bucket);

      const totals = daily.reduce(
        (acc, row) => ({
          send: acc.send + row.send,
          contact: acc.contact + row.contact,
          total: acc.total + row.send + row.contact,
        }),
        { send: 0, contact: 0, total: 0 }
      );

      return { daily, totals };
    }),

  // Distinct type values for this project's logs — feeds the filter dropdown.
  types: cmsProcedure.query(async ({ input }) => {
    const repoId = await resolveRepoId(input.owner, input.repo);
    const rows = await db
      .selectDistinct({ type: emailLogs.type })
      .from(emailLogs)
      .where(eq(emailLogs.repoId, repoId))
      .orderBy(emailLogs.type);
    return rows.map((r) => r.type);
  }),

  get: cmsProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const [row] = await db
        .select({ ...publicColumns, repoId: emailLogs.repoId })
        .from(emailLogs)
        .where(eq(emailLogs.id, input.id))
        .limit(1);

      // NOT_FOUND for both missing and foreign rows — don't leak existence.
      if (!row || (row.repoId !== repoId && ctx.session.user.role !== "admin")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      const { repoId: _repoId, ...email } = row;
      return { ...email, createdAt: email.createdAt.toISOString() };
    }),

  // Mutation on purpose: the presigned URL dies in ~60 seconds, so it must be
  // fetched fresh on every view and never cached by react-query.
  getViewUrl: cmsProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const [row] = await db
        .select({ repoId: emailLogs.repoId })
        .from(emailLogs)
        .where(eq(emailLogs.id, input.id))
        .limit(1);

      if (!row || (row.repoId !== repoId && ctx.session.user.role !== "admin")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      // The Worker call runs with the admin API key, which can read any log —
      // the ownership check above is the real gate.
      const { data, error } = await agency().emails.getHtml(input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return data;
    }),

  // By-id variants for the short /e/[id] link: authorize from the email's own
  // repoId instead of owner/repo in the URL.
  getById: authenticatedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const row = await authorizeEmailById(ctx.session.user, input.id);
      const { repoId: _repoId, ...email } = row;
      return { ...email, createdAt: email.createdAt.toISOString() };
    }),

  getViewUrlById: authenticatedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await authorizeEmailById(ctx.session.user, input.id);

      const { data, error } = await agency().emails.getHtml(input.id);
      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
      return data;
    }),
});
