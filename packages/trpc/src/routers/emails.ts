import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import {
  authenticatedProcedure,
  cmsFullAccessProcedure,
  cmsProcedure,
  createTRPCRouter,
} from "../init";
import {
  createUsesendDomain,
  deleteUsesendDomain,
  getEmailById,
  getEmailsSnapshot,
  getUsesendDomain,
  isDomainVerified,
  listUsesendDomains,
  verifyUsesendDomain,
  type UseSendDomain,
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
    .select({
      usesendDomainId: hubProject.usesendDomainId,
      usesendPendingDomainId: hubProject.usesendPendingDomainId,
    })
    .from(hubProject)
    .where(
      sql`lower(${hubProject.owner}) = lower(${org}) and lower(${hubProject.repo}) = lower(${repo})`
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  return {
    usesendDomainId: row.usesendDomainId,
    usesendPendingDomainId: row.usesendPendingDomainId,
  };
}

const projectWhere = (owner: string | undefined, repo: string) => {
  const org = owner ?? process.env.GITHUB_ORG;
  return sql`lower(${hubProject.owner}) = lower(${org}) and lower(${hubProject.repo}) = lower(${repo})`;
};

// The connect flow's public view of a pending domain.
const toPendingDomain = (domain: UseSendDomain) => ({
  id: domain.id,
  name: domain.name,
  verified: isDomainVerified(domain),
  isVerifying: domain.isVerifying,
  dnsRecords: domain.dnsRecords,
});

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

  // ─── Sending-domain connect flow (full-access only) ────────────────────

  // Current setup state: the pending domain with fresh per-record DNS
  // statuses, or null when nothing is in flight.
  domainSetup: cmsFullAccessProcedure.query(async ({ input }) => {
    const project = await resolveProject(input.owner, input.repo);
    if (!project.usesendPendingDomainId) return { pending: null };
    const domain = await getUsesendDomain(
      Number(project.usesendPendingDomainId)
    );
    if (!domain) {
      // Deleted on the useSend side — clear the stale pointer.
      await db
        .update(hubProject)
        .set({ usesendPendingDomainId: null })
        .where(projectWhere(input.owner, input.repo));
      return { pending: null };
    }
    return { pending: toPendingDomain(domain) };
  }),

  createDomain: cmsFullAccessProcedure
    .input(
      z.object({
        domain: z
          .string()
          .trim()
          .toLowerCase()
          .transform((value) => value.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""))
          .pipe(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Enter a valid domain")),
      })
    )
    .mutation(async ({ input }) => {
      const project = await resolveProject(input.owner, input.repo);
      if (project.usesendDomainId || project.usesendPendingDomainId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A sending domain is already set up for this project.",
        });
      }
      // Adopt an existing useSend domain with the same name instead of
      // creating a duplicate (e.g. a retried setup).
      const existing = (await listUsesendDomains()).find(
        (domain) => domain.name === input.domain
      );
      const domain = existing ?? (await createUsesendDomain(input.domain));
      await db
        .update(hubProject)
        .set({ usesendPendingDomainId: String(domain.id) })
        .where(projectWhere(input.owner, input.repo));
      return { pending: toPendingDomain(domain) };
    }),

  verifyDomain: cmsFullAccessProcedure.mutation(async ({ input }) => {
    const project = await resolveProject(input.owner, input.repo);
    if (!project.usesendPendingDomainId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No domain setup in progress.",
      });
    }
    const id = Number(project.usesendPendingDomainId);
    await verifyUsesendDomain(id);
    const domain = await getUsesendDomain(id);
    if (!domain) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Domain no longer exists in useSend.",
      });
    }
    if (isDomainVerified(domain)) {
      // The only write path for usesendDomainId — always behind a
      // confirmed-verified GET.
      await db
        .update(hubProject)
        .set({
          usesendDomainId: String(domain.id),
          usesendPendingDomainId: null,
        })
        .where(projectWhere(input.owner, input.repo));
      return { verified: true as const };
    }
    return { verified: false as const, pending: toPendingDomain(domain) };
  }),

  cancelDomainSetup: cmsFullAccessProcedure.mutation(async ({ input }) => {
    const project = await resolveProject(input.owner, input.repo);
    // Never touches usesendDomainId — a connected domain can't be deleted here.
    if (project.usesendPendingDomainId) {
      await deleteUsesendDomain(Number(project.usesendPendingDomainId));
      await db
        .update(hubProject)
        .set({ usesendPendingDomainId: null })
        .where(projectWhere(input.owner, input.repo));
    }
    return { ok: true };
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
