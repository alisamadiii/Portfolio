import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { account, hubProject } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import { CALENDAR_FULL_SCOPE, scopeSatisfied } from "../lib/integrations";
import {
  gcalTokenFor,
  googleAccountEmail,
  listCalendars,
  listEvents,
} from "../lib/integrations/calendar";

// The project's Google Calendar app: the client connects Google (full
// calendar scope, always through Google's consent screen) and the hub shows
// their calendars and events. Read-only: nothing is written to the calendar.

const projectRow = async (projectId: string) => {
  const [row] = await db
    .select({
      gcalConnectedUserId: hubProject.gcalConnectedUserId,
      gcalAccountId: hubProject.gcalAccountId,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
};

const projectToken = async (projectId: string) => {
  const row = await projectRow(projectId);
  if (!row.gcalConnectedUserId || !row.gcalAccountId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect Google Calendar first." });
  }
  return gcalTokenFor(row.gcalConnectedUserId, row.gcalAccountId);
};

const isoDate = z.string().datetime({ offset: true });

export const gcalRouter = createTRPCRouter({
  status: cmsProcedure.query(async ({ ctx }) => {
    const row = await projectRow(ctx.projectId);
    const connected = !!(row.gcalConnectedUserId && row.gcalAccountId);
    if (!connected) return { connected, email: null };
    const token = await gcalTokenFor(row.gcalConnectedUserId!, row.gcalAccountId!).catch(() => null);
    return { connected, email: token ? await googleAccountEmail(token) : null };
  }),

  // Runs right after Google's consent screen: binds the Google account the
  // caller just linked with the calendar scope (their most recently written
  // Google account row that has it).
  connect: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const rows = await db
      .select({ accountId: account.accountId, scope: account.scope })
      .from(account)
      .where(and(eq(account.userId, ctx.user.id), eq(account.providerId, "google")))
      .orderBy(desc(account.updatedAt));
    const linked = rows.find((r) => scopeSatisfied(r.scope, CALENDAR_FULL_SCOPE));
    if (!linked) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Google Calendar access wasn't granted. Try again and allow calendar access.",
      });
    }
    await db
      .update(hubProject)
      .set({ gcalConnectedUserId: ctx.user.id, gcalAccountId: linked.accountId })
      .where(eq(hubProject.id, ctx.projectId));
    return { ok: true };
  }),

  // Unbinds the project only. The Google account row stays: it may be the
  // user's sign-in or used by other projects (revoke it from Integrations).
  disconnect: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    await db
      .update(hubProject)
      .set({ gcalConnectedUserId: null, gcalAccountId: null })
      .where(eq(hubProject.id, ctx.projectId));
    return { ok: true };
  }),

  calendars: cmsProcedure.query(async ({ ctx }) => {
    const token = await projectToken(ctx.projectId);
    const calendars = await listCalendars(token);
    // Primary first, then by name.
    return calendars.sort((a, b) => Number(b.primary) - Number(a.primary) || a.name.localeCompare(b.name));
  }),

  events: cmsProcedure
    .input(
      z
        .object({ calendarId: z.string().min(1).max(500), from: isoDate, to: isoDate })
        .refine((v) => new Date(v.to).getTime() - new Date(v.from).getTime() <= 62 * 24 * 3600 * 1000, {
          message: "Range too long",
        })
    )
    .query(async ({ ctx, input }) => {
      const token = await projectToken(ctx.projectId);
      return listEvents(token, input.calendarId, input.from, input.to);
    }),
});
