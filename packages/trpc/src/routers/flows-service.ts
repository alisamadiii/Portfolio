import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import { createTRPCRouter, flowsServiceProcedure } from "../init";
import { planAllowsApp } from "../lib/apps";
import { gcalTokenFor, googleAccountEmail } from "../lib/integrations/calendar";
import {
  runFlowsCalendarAction,
  writableCalendars,
  type FlowsCalendarAction,
} from "../lib/integrations/flows-calendar";
import { getEntitlement } from "../lib/payment/entitlements";

// Called only by Flows (the automations service), server to server, with the
// shared FLOWS_HUB_KEY (see flowsServiceProcedure). A Flows workspace id is the
// hub project id, so each call reaches exactly one project's Google Calendar:
// the account bound in the hub's Calendar app. Tokens never leave the hub.

const NOT_CONNECTED =
  "Google Calendar isn't connected for this project. Connect it in the client hub → Calendar.";

async function calendarAccess(projectId: string) {
  const [row] = await db
    .select({
      apps: hubProject.apps,
      gcalConnectedUserId: hubProject.gcalConnectedUserId,
      gcalAccountId: hubProject.gcalAccountId,
    })
    .from(hubProject)
    .where(and(eq(hubProject.id, projectId), eq(hubProject.hidden, false)));
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  if (!row.gcalConnectedUserId || !row.gcalAccountId) return { ok: false as const, reason: NOT_CONNECTED };
  // Installed on the project (admins can install outside a plan) or allowed by its plan.
  const entitlement = row.apps.includes("gcal") ? null : await getEntitlement(projectId).catch(() => null);
  if (!row.apps.includes("gcal") && (!entitlement || !planAllowsApp("gcal", entitlement))) {
    return { ok: false as const, reason: "Google Calendar isn't included in this project's plan." };
  }
  return { ok: true as const, userId: row.gcalConnectedUserId, accountId: row.gcalAccountId };
}

async function calendarToken(projectId: string) {
  const access = await calendarAccess(projectId);
  if (!access.ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: access.reason });
  return gcalTokenFor(access.userId, access.accountId);
}

// Workflow templates render to strings; the action validates each value.
const actionInput = z.object({
  params: z.record(z.string(), z.string().max(10_000)).default({}),
  // Flows run id + node id: a retried step returns the same event.
  idempotencyKey: z.string().min(1).max(200),
});

const action = (name: FlowsCalendarAction) =>
  flowsServiceProcedure.input(actionInput).mutation(async ({ ctx, input }) => {
    const token = await calendarToken(ctx.projectId);
    return runFlowsCalendarAction(name, {
      token,
      projectId: ctx.projectId,
      params: input.params,
      idempotencyKey: input.idempotencyKey,
    });
  });

export const flowsServiceRouter = createTRPCRouter({
  // Never throws for "not connected": Flows shows the reason in its UI.
  calendarStatus: flowsServiceProcedure.query(async ({ ctx }) => {
    const access = await calendarAccess(ctx.projectId);
    if (!access.ok) return { connected: false, reason: access.reason, email: null, calendars: [] };
    try {
      const token = await gcalTokenFor(access.userId, access.accountId);
      const [email, calendars] = await Promise.all([googleAccountEmail(token), writableCalendars(token)]);
      return { connected: true, reason: null, email, calendars };
    } catch (error) {
      const reason = error instanceof TRPCError ? error.message : "Could not reach Google Calendar.";
      return { connected: false, reason, email: null, calendars: [] };
    }
  }),

  findFreeSlots: action("find_free_slots"),
  createEvent: action("create_event"),
  listEvents: action("list_events"),
  cancelEvent: action("cancel_event"),
});
