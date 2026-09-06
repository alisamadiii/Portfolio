import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import {
  authenticatedProcedure,
  cmsProcedure,
  createTRPCRouter,
} from "../init";
import {
  getEmailById,
  getEmailsSnapshot,
  type UseSendEmailRow,
} from "../lib/usesend";
import { getToken } from "../lib/cms/token";

// Emails live in the self-hosted useSend instance. Per-project scoping works
// through the sending domain: projects with hub_project.usesend_domain_id set
// see that domain's sends; projects without one get nothing (the tab shows a
// setup card). The useSend list API filters by domainId server-side; dates
// and search are filtered in memory over the snapshot (../lib/usesend.ts).

const NOT_FOUND = () =>
  new TRPCError({ code: "NOT_FOUND", message: "Email not found" });

const emailId = z.string().min(1).max(100);

async function resolveProject(owner: string | undefined, repo: string) {
  const org = owner ?? process.env.GITHUB_ORG;
  if (!org) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Missing owner" });
  }
  const [row] = await db
    .select({ usesendDomainId: hubProject.usesendDomainId })
    .from(hubProject)
    .where(
      sql`lower(${hubProject.owner}) = lower(${org}) and lower(${hubProject.repo}) = lower(${repo})`
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  return { usesendDomainId: row.usesendDomainId };
}

// Other domains' emails never leave the server — every response is narrowed
// to this shape.
const toPublic = (e: UseSendEmailRow) => ({
  id: e.id,
  fromAddress: e.fromAddress,
  to: e.to,
  subject: e.subject,
  createdAt: e.createdAt,
  lastEvent: e.lastEvent,
});

// Snapshot scoped by the project's sending domain. No domain configured →
// nothing is fetched, for admins too (the UI shows a setup card instead —
// see the `enabled` procedure).
async function projectEmails(project: { usesendDomainId: string | null }) {
  if (!project.usesendDomainId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Emails are not set up for this project.",
    });
  }
  return getEmailsSnapshot(project.usesendDomainId);
}

// Authorize a caller for a single email by id alone — powers the short
// /e/[id] link where owner/repo aren't in the URL. The detail endpoint
// returns no domainId, so the email's domain comes from the instance-wide
// snapshot (server-side only — never returned to the caller). Non-admins get
// access iff that domain matches a project they can read. Throws NOT_FOUND
// (never leaks existence) for missing emails or callers without access.
async function authorizeEmailById(
  user: { id: string; email: string; role?: string | null },
  id: string
) {
  const email = await getEmailById(id);
  if (!email) throw NOT_FOUND();

  if (user.role !== "admin") {
    const snapshot = await getEmailsSnapshot();
    const domainId = snapshot.find((e) => e.id === id)?.domainId;
    // Outside the snapshot window (or undomained) → no way to scope it.
    if (domainId == null) throw NOT_FOUND();
    const projects = await db
      .select({ owner: hubProject.owner, repo: hubProject.repo })
      .from(hubProject)
      .where(eq(hubProject.usesendDomainId, domainId));
    let allowed = false;
    for (const project of projects) {
      try {
        await getToken(user, project.owner, project.repo);
        allowed = true;
        break;
      } catch {
        // keep trying the remaining projects on this domain
      }
    }
    if (!allowed) throw NOT_FOUND();
  }

  return email;
}

export const emailsRouter = createTRPCRouter({
  // Cheap gate for the Emails tab — the UI checks this before firing
  // list/stats, and shows a setup card when the project has no sending
  // domain configured.
  enabled: cmsProcedure.query(async ({ input }) => {
    const project = await resolveProject(input.owner, input.repo);
    return { enabled: !!project.usesendDomainId };
  }),

  list: cmsProcedure
    .input(
      z.object({
        // No superjson transformer — dates arrive as ISO strings.
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        search: z.string().trim().max(200).optional(),
        page: z.number().int().min(0).default(0),
        // 10 for the table; the PDF export passes the max to grab everything.
        limit: z.number().int().min(1).max(5000).default(10),
      })
    )
    .query(async ({ input }) => {
      const project = await resolveProject(input.owner, input.repo);
      const emails = await projectEmails(project);

      const fromTs = input.from?.getTime();
      const toTs = input.to?.getTime();
      const query = input.search?.toLowerCase();

      const filtered = emails.filter((e) => {
        const ts = new Date(e.createdAt).getTime();
        if (fromTs !== undefined && ts < fromTs) return false;
        if (toTs !== undefined && ts > toTs) return false;
        if (query) {
          const haystack =
            `${e.subject} ${e.fromAddress} ${e.to.join(" ")}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      });

      const start = input.page * input.limit;
      return {
        items: filtered.slice(start, start + input.limit).map(toPublic),
        total: filtered.length,
      };
    }),

  // Daily counts + totals for the analytics section, over the same date range
  // as the table. The client zero-fills days with no emails.
  stats: cmsProcedure
    .input(
      z.object({
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const project = await resolveProject(input.owner, input.repo);
      const emails = await projectEmails(project);

      const fromTs = input.from?.getTime();
      const toTs = input.to?.getTime();

      const DELIVERED = new Set(["delivered", "opened", "clicked"]);
      const PROBLEMS = new Set(["bounced", "rejected", "failed"]);

      const byDay = new Map<string, number>();
      const totals = { total: 0, delivered: 0, problems: 0 };
      for (const e of emails) {
        const ts = new Date(e.createdAt).getTime();
        if (fromTs !== undefined && ts < fromTs) continue;
        if (toTs !== undefined && ts > toTs) continue;
        const date = e.createdAt.slice(0, 10);
        byDay.set(date, (byDay.get(date) ?? 0) + 1);
        totals.total += 1;
        if (DELIVERED.has(e.lastEvent)) totals.delivered += 1;
        else if (PROBLEMS.has(e.lastEvent)) totals.problems += 1;
      }

      const daily = [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, total]) => ({ date, total }));

      return { daily, totals };
    }),

  get: cmsProcedure
    .input(z.object({ id: emailId }))
    .query(async ({ input }) => {
      const project = await resolveProject(input.owner, input.repo);
      const emails = await projectEmails(project);
      const email = emails.find((e) => e.id === input.id);
      if (!email) throw NOT_FOUND();
      return toPublic(email);
    }),

  // Mutation on purpose: fetched fresh on every view, never cached by
  // react-query.
  getViewUrl: cmsProcedure
    .input(z.object({ id: emailId }))
    .mutation(async ({ input }) => {
      const project = await resolveProject(input.owner, input.repo);

      // The detail endpoint has no domainId — scope by requiring the id in
      // the project's snapshot. NOT_FOUND for foreign emails too, don't leak
      // existence.
      const emails = await projectEmails(project);
      if (!emails.some((e) => e.id === input.id)) throw NOT_FOUND();

      const email = await getEmailById(input.id);
      if (!email) throw NOT_FOUND();
      if (!email.html) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Preview unavailable for this email.",
        });
      }
      return { html: email.html };
    }),

  // By-id variants for the short /e/[id] link: authorize from the email's
  // sending domain instead of owner/repo in the URL.
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
