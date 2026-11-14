import { TRPCError } from "@trpc/server";
import { and, desc, eq, ne } from "drizzle-orm";
import z from "zod";

import { readAccountToken } from "@workspace/auth/tokens";
import { db } from "@workspace/drizzle/index";
import { account, hubProject } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import {
  getNetlifySite,
  netlifyTokenFor,
  setNetlifySiteEnv,
} from "../lib/netlify";
import {
  createResendApiKey,
  deleteResendApiKey,
  forgetResendToken,
  getResendDomain,
  getResendEmail,
  listResendDomains,
  listResendApiKeys,
  listResendEmails,
  resendTokenFor,
  revokeResendGrant,
} from "../lib/resend";

// The project's Resend app: the client links Resend (OAuth) and binds it to
// the project, then the hub reads their domains + recent emails and mints
// API keys for the website without anyone sharing a password. One Resend
// team per project: every connect goes through Resend's consent screen and
// binds the team that was just linked, never a team another project uses.

const projectRow = async (projectId: string) => {
  const [row] = await db
    .select({
      resendConnectedUserId: hubProject.resendConnectedUserId,
      resendAccountId: hubProject.resendAccountId,
      netlifySiteId: hubProject.netlifySiteId,
      netlifyConnectedUserId: hubProject.netlifyConnectedUserId,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
};

const projectToken = async (projectId: string) => {
  const row = await projectRow(projectId);
  if (!row.resendConnectedUserId || !row.resendAccountId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Connect Resend first.",
    });
  }
  return resendTokenFor(row.resendConnectedUserId, row.resendAccountId);
};

export const resendRouter = createTRPCRouter({
  status: cmsProcedure.query(async ({ ctx }) => {
    const row = await projectRow(ctx.projectId);
    return {
      connected: !!(row.resendConnectedUserId && row.resendAccountId),
      onNetlify: !!row.netlifySiteId,
    };
  }),

  // Runs right after Resend's consent screen: binds the team the caller just
  // linked (their most recently written Resend account row). A team already
  // bound to another project is refused, so a project never inherits it.
  connect: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const [linked] = await db
      .select({ accountId: account.accountId })
      .from(account)
      .where(and(eq(account.userId, ctx.user.id), eq(account.providerId, "resend")))
      .orderBy(desc(account.updatedAt))
      .limit(1);
    if (!linked) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Resend wasn't connected. Try again.",
      });
    }
    const [taken] = await db
      .select({ repo: hubProject.repo })
      .from(hubProject)
      .where(
        and(
          eq(hubProject.resendAccountId, linked.accountId),
          ne(hubProject.id, ctx.projectId)
        )
      )
      .limit(1);
    if (taken) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `That Resend team is already connected to ${taken.repo}. Choose a different team on Resend's screen.`,
      });
    }
    await db
      .update(hubProject)
      .set({ resendConnectedUserId: ctx.user.id, resendAccountId: linked.accountId })
      .where(eq(hubProject.id, ctx.projectId));
    return { ok: true };
  }),

  // Unbinds the team and ends the grant: the team is dedicated to this
  // project, so its link has no other use.
  disconnect: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const row = await projectRow(ctx.projectId);
    if (row.resendConnectedUserId && row.resendAccountId) {
      const where = and(
        eq(account.userId, row.resendConnectedUserId),
        eq(account.providerId, "resend"),
        eq(account.accountId, row.resendAccountId)
      );
      const [linked] = await db
        .select({ refreshToken: account.refreshToken })
        .from(account)
        .where(where)
        .limit(1);
      const refreshToken = await readAccountToken(linked?.refreshToken);
      if (refreshToken) await revokeResendGrant(refreshToken);
      await db.delete(account).where(where);
      forgetResendToken(row.resendConnectedUserId, row.resendAccountId);
    }
    await db
      .update(hubProject)
      .set({ resendConnectedUserId: null, resendAccountId: null })
      .where(eq(hubProject.id, ctx.projectId));
    return { ok: true };
  }),

  overview: cmsProcedure.query(async ({ ctx }) => {
    const token = await projectToken(ctx.projectId);
    const [domains, emails] = await Promise.all([
      listResendDomains(token),
      listResendEmails(token),
    ]);
    return {
      domains: domains.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        region: d.region,
        createdAt: d.created_at,
      })),
      emails: emails.map((e) => ({
        id: e.id,
        to: Array.isArray(e.to) ? e.to.join(", ") : e.to,
        subject: e.subject,
        status: e.last_event,
        createdAt: e.created_at,
      })),
    };
  }),

  domain: cmsProcedure
    .input(z.object({ domainId: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const token = await projectToken(ctx.projectId);
      const domain = await getResendDomain(token, input.domainId);
      return {
        name: domain.name,
        status: domain.status,
        records: (domain.records ?? []).map((r) => ({
          type: r.type,
          name: r.name,
          value: r.value,
          priority: r.priority ?? null,
          status: r.status,
        })),
      };
    }),

  // One sent email with its content, for the email detail page.
  email: cmsProcedure
    .input(z.object({ emailId: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const token = await projectToken(ctx.projectId);
      const e = await getResendEmail(token, input.emailId);
      const list = (v: string[] | string | null | undefined) =>
        Array.isArray(v) ? v : v ? [v] : [];
      return {
        id: e.id,
        from: e.from,
        to: list(e.to),
        cc: list(e.cc),
        bcc: list(e.bcc),
        replyTo: list(e.reply_to),
        subject: e.subject,
        status: e.last_event,
        createdAt: e.created_at,
        scheduledAt: e.scheduled_at ?? null,
        html: e.html ?? null,
        text: e.text ?? null,
        tags: e.tags ?? [],
      };
    }),

  // Existing keys (names + dates; Resend never returns a secret again).
  apiKeys: cmsFullAccessProcedure.query(async ({ ctx }) => {
    const token = await projectToken(ctx.projectId);
    const keys = await listResendApiKeys(token);
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      createdAt: k.created_at,
      lastUsedAt: k.last_used_at ?? null,
    }));
  }),

  deleteApiKey: cmsFullAccessProcedure
    .input(z.object({ keyId: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const token = await projectToken(ctx.projectId);
      await deleteResendApiKey(token, input.keyId);
      return { ok: true };
    }),

  // The key is returned once and never stored by the hub.
  createApiKey: cmsFullAccessProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(50),
        domainId: z.string().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const token = await projectToken(ctx.projectId);
      const key = await createResendApiKey(token, input);
      return { id: key.id, token: key.token };
    }),

  // Saves a freshly minted key as RESEND_API_KEY on the project's Netlify site.
  pushToNetlify: cmsFullAccessProcedure
    .input(z.object({ apiKey: z.string().regex(/^re_[A-Za-z0-9_]+$/) }))
    .mutation(async ({ ctx, input }) => {
      const row = await projectRow(ctx.projectId);
      if (!row.netlifySiteId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This site isn't on Netlify.",
        });
      }
      const token = await netlifyTokenFor(row);
      const site = await getNetlifySite(token, row.netlifySiteId);
      await setNetlifySiteEnv(token, site, "RESEND_API_KEY", input.apiKey);
      return { ok: true };
    }),
});
