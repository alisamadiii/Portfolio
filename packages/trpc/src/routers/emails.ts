import { requireFeature } from "@workspace/trpc/lib/payment/entitlements";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import {
  authenticatedProcedure,
  cmsFullAccessProcedure,
  cmsProcedure,
  createTRPCRouter,
} from "../init";
import { getEmailById, type UseSendEmailRow } from "../lib/usesend";

// Emails live in the self-hosted useSend instance. Each project is its own
// useSend team (workspace), keyed by projectId; hub_project.usesendApiKey is
// that team's key. The hub only reads the provisioning state, the notify
// address, and single emails behind the short /e/[id] link.

const NOT_FOUND = () =>
  new TRPCError({ code: "NOT_FOUND", message: "Email not found" });

const emailId = z.string().min(1).max(100);

async function resolveProject(projectId: string) {
  const [row] = await db
    .select({
      usesendApiKey: hubProject.usesendApiKey,
      notifyEmail: hubProject.notifyEmail,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  return row;
}

// Other teams' emails never leave the server — every response is narrowed
// to this shape.
const toPublic = (e: UseSendEmailRow) => ({
  id: e.id,
  fromAddress: e.fromAddress,
  to: e.to,
  subject: e.subject,
  createdAt: e.createdAt,
  lastEvent: e.lastEvent,
});

// The /e/[id] short link has no project in the URL, and useSend emails carry
// no project reference, so only admins can open them. Everyone else gets
// NOT_FOUND (never leaks existence).
async function authorizeEmailById(
  user: { id: string; email: string; role?: string | null },
  id: string
) {
  if (user.role !== "admin") throw NOT_FOUND();
  const email = await getEmailById(id);
  if (!email) throw NOT_FOUND();
  return email;
}

export const emailsRouter = createTRPCRouter({
  // Whether the project's useSend team exists, plus the notify address.
  enabled: cmsProcedure.query(async ({ ctx }) => {
    const project = await resolveProject(ctx.projectId);
    return {
      enabled: !!project.usesendApiKey,
      notifyEmail: project.notifyEmail ?? null,
    };
  }),

  // Where form submissions (lead / contact) are emailed. Empty = fall back to
  // the project owner's account email.
  setNotifyEmail: cmsFullAccessProcedure
    .input(z.object({ email: z.string().trim().email().or(z.literal("")) }))
    .mutation(async ({ ctx, input }) => {
      await requireFeature(ctx.user, ctx.projectId, "emails");
      await db
        .update(hubProject)
        .set({ notifyEmail: input.email || null })
        .where(eq(hubProject.id, ctx.projectId));
      return { notifyEmail: input.email || null };
    }),

  // By-id variants for the short /e/[id] link.
  getById: authenticatedProcedure
    .input(z.object({ id: emailId }))
    .query(async ({ ctx, input }) => {
      const email = await authorizeEmailById(ctx.session.user, input.id);
      return toPublic(email);
    }),

  getViewUrlById: authenticatedProcedure
    .input(z.object({ id: emailId }))
    .mutation(async ({ ctx, input }) => {
      const email = await authorizeEmailById(ctx.session.user, input.id);
      if (!email.html) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Preview unavailable for this email.",
        });
      }
      return { html: email.html };
    }),
});
