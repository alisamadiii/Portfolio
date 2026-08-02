import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { emailLogs } from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../init";
import { agency } from "../lib/agency";

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

export const emailsRouter = createTRPCRouter({
  list: authenticatedProcedure
    .input(
      z
        .object({
          // No superjson transformer — dates arrive as ISO strings.
          from: z.coerce.date().optional(),
          to: z.coerce.date().optional(),
          search: z.string().trim().max(200).optional(),
          type: z.string().trim().max(100).optional(),
          page: z.number().int().min(0).default(0),
          // 10 for the table; the PDF export passes the max to grab everything.
          limit: z.number().int().min(1).max(5000).default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const pattern = input?.search ? `%${input.search}%` : null;
      const where = and(
        eq(emailLogs.userId, ctx.session.user.id),
        input?.from ? gte(emailLogs.createdAt, input.from) : undefined,
        input?.to ? lte(emailLogs.createdAt, input.to) : undefined,
        input?.type ? eq(emailLogs.type, input.type) : undefined,
        pattern
          ? or(
              ilike(emailLogs.subject, pattern),
              ilike(emailLogs.fromAddress, pattern),
              ilike(emailLogs.visitorEmail, pattern),
              sql`array_to_string(${emailLogs.to}, ' ') ilike ${pattern}`
            )
          : undefined
      );

      const page = input?.page ?? 0;
      const limit = input?.limit ?? 10;

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

  // Distinct type values for the caller's own logs — feeds the filter dropdown.
  types: authenticatedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .selectDistinct({ type: emailLogs.type })
      .from(emailLogs)
      .where(eq(emailLogs.userId, ctx.session.user.id))
      .orderBy(emailLogs.type);
    return rows.map((r) => r.type);
  }),

  get: authenticatedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({ ...publicColumns, userId: emailLogs.userId })
        .from(emailLogs)
        .where(eq(emailLogs.id, input.id))
        .limit(1);

      // NOT_FOUND for both missing and foreign rows — don't leak existence.
      if (
        !row ||
        (row.userId !== ctx.session.user.id &&
          ctx.session.user.role !== "admin")
      ) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
      }

      const { userId: _userId, ...email } = row;
      return { ...email, createdAt: email.createdAt.toISOString() };
    }),

  // Mutation on purpose: the presigned URL dies in ~60 seconds, so it must be
  // fetched fresh on every view and never cached by react-query.
  getViewUrl: authenticatedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select({ userId: emailLogs.userId })
        .from(emailLogs)
        .where(eq(emailLogs.id, input.id))
        .limit(1);

      if (
        !row ||
        (row.userId !== ctx.session.user.id &&
          ctx.session.user.role !== "admin")
      ) {
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
});
