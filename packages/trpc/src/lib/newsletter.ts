import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";
import { UseSendError } from "@workspace/email/usesend";

import { ensureProjectWorkspace, workspaceFetch } from "./usesend-provision";

// ─── Newsletter: the project's own useSend workspace ──────────────
// Isolation rule: every call names the project's OWN useSend team, read here
// from hub_project by projectId (already membership-checked by cmsProcedure),
// never from client input. useSend (admin key + X-Team-Id) scopes every query
// to that team, so any id a client sends (campaign, contact, template) can
// only ever resolve inside this project's workspace. The admin key never
// leaves the server.

export type ProjectMail = {
  projectId: string;
  teamId: number;
  domainId: number | null;
  contactBookId: string | null;
};

/** Domain id placeholder while a create is in flight (one-domain claim). */
export const DOMAIN_CLAIMED = -1;

export const NOT_SET_UP = "The newsletter isn't set up for this project yet.";

/** Whether the project has its own useSend workspace. */
export async function isProvisioned(projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ teamId: hubProject.usesendTeamId })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  return row.teamId != null;
}

/** Creates the project's workspace (or links the existing one). Clear errors for the UI. */
export async function setUpWorkspace(
  projectId: string,
  workspaceName: string,
  /** Admins see the underlying cause (e.g. a mismatched admin key). */
  showCause = false
): Promise<void> {
  try {
    await ensureProjectWorkspace({ projectId, name: workspaceName });
  } catch (error) {
    console.error("Newsletter workspace setup failed", projectId, error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: showCause
        ? `Couldn't create the newsletter workspace: ${(error as Error).message}`
        : "Couldn't create the newsletter workspace. Please try again or contact us.",
    });
  }
}

export async function projectMail(projectId: string): Promise<ProjectMail> {
  const [row] = await db
    .select({
      teamId: hubProject.usesendTeamId,
      domainId: hubProject.usesendDomainId,
      contactBookId: hubProject.usesendContactBookId,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

  if (row.teamId == null) {
    // Set up explicitly from the Newsletter page (newsletter.setup).
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: NOT_SET_UP });
  }

  return {
    projectId,
    teamId: row.teamId,
    domainId: row.domainId,
    contactBookId: row.contactBookId,
  };
}

const TRPC_CODE: Record<number, TRPCError["code"]> = {
  400: "BAD_REQUEST",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "TOO_MANY_REQUESTS",
};

/** useSend call scoped to the project's team (admin key + X-Team-Id). */
export async function teamFetch<T>(
  mail: ProjectMail,
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  try {
    return await workspaceFetch<T>(mail.teamId, path, init);
  } catch (error) {
    if (error instanceof UseSendError) {
      const code = TRPC_CODE[error.status];
      if (code) throw new TRPCError({ code, message: error.message });
      console.error("useSend error", path, error.status, error.message);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "The email service didn't respond. Please try again.",
      });
    }
    throw error;
  }
}

// ── Domain ──

export type DnsRecord = {
  type: "MX" | "TXT";
  name: string;
  value: string;
  ttl: string;
  priority?: string | null;
  status: string;
  recommended?: boolean;
};

export type UseSendDomain = {
  id: number;
  name: string;
  status: string;
  region: string;
  clickTracking: boolean;
  openTracking: boolean;
  dnsRecords: DnsRecord[];
  createdAt: string;
};

const setDomainId = (projectId: string, domainId: number | null) =>
  db.update(hubProject).set({ usesendDomainId: domainId }).where(eq(hubProject.id, projectId));

/** The project's one domain, or null. Clears a stale id (deleted elsewhere). */
export async function projectDomain(mail: ProjectMail): Promise<UseSendDomain | null> {
  if (mail.domainId == null || mail.domainId === DOMAIN_CLAIMED) return null;
  try {
    return await teamFetch<UseSendDomain>(mail, `/api/v1/domains/${mail.domainId}`);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      await setDomainId(mail.projectId, null);
      return null;
    }
    throw error;
  }
}

/** The project's domain, required verified (status SUCCESS) for sending. */
export async function verifiedDomain(mail: ProjectMail): Promise<UseSendDomain> {
  const domain = await projectDomain(mail);
  if (!domain) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Add your domain first." });
  }
  if (domain.status !== "SUCCESS") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Verify your domain before sending.",
    });
  }
  return domain;
}

/**
 * Adds the project's one sending domain. The column is claimed first with a
 * conditional update, so two concurrent requests can't both create one; the
 * useSend fork also caps workspace teams at one domain.
 */
export async function createProjectDomain(
  mail: ProjectMail,
  name: string,
  region: string
): Promise<UseSendDomain> {
  const claimed = await db
    .update(hubProject)
    .set({ usesendDomainId: DOMAIN_CLAIMED })
    .where(and(eq(hubProject.id, mail.projectId), isNull(hubProject.usesendDomainId)))
    .returning({ id: hubProject.id });
  if (!claimed.length) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This project already has a domain. Delete it to add a different one.",
    });
  }

  try {
    const domain = await teamFetch<UseSendDomain>(mail, "/api/v1/domains", {
      method: "POST",
      body: { name, region },
    });
    await setDomainId(mail.projectId, domain.id);
    return domain;
  } catch (error) {
    await setDomainId(mail.projectId, null);
    throw error;
  }
}

export async function deleteProjectDomain(mail: ProjectMail): Promise<void> {
  if (mail.domainId != null && mail.domainId !== DOMAIN_CLAIMED) {
    try {
      await teamFetch(mail, `/api/v1/domains/${mail.domainId}`, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TRPCError && error.code === "NOT_FOUND")) throw error;
    }
  }
  await setDomainId(mail.projectId, null);
}

// ── Subscriber list ──

/** The project's subscriber list (contact book), created on first use. */
export async function ensureContactBook(mail: ProjectMail): Promise<string> {
  if (mail.contactBookId) return mail.contactBookId;

  const book = await teamFetch<{ id: string }>(mail, "/api/v1/contactBooks", {
    method: "POST",
    // useSend turns double opt-in ON by default for new books, which emails a
    // "confirm your subscription" to every contact added (imports included)
    // and holds them as unsubscribed. Our lists are imported/opted-in already.
    body: { name: "Subscribers", doubleOptInEnabled: false },
  });
  const saved = await db
    .update(hubProject)
    .set({ usesendContactBookId: book.id })
    .where(and(eq(hubProject.id, mail.projectId), isNull(hubProject.usesendContactBookId)))
    .returning({ id: hubProject.usesendContactBookId });

  if (saved.length) return book.id;

  // Lost a race: another request stored its book first. Drop ours, use theirs.
  await teamFetch(mail, `/api/v1/contactBooks/${book.id}`, { method: "DELETE" }).catch(() => {});
  const [row] = await db
    .select({ id: hubProject.usesendContactBookId })
    .from(hubProject)
    .where(eq(hubProject.id, mail.projectId))
    .limit(1);
  return row!.id!;
}

/**
 * The contact list to act on: an explicit listId (any list in the project's
 * workspace; useSend 404s ids from other teams because every call is scoped
 * to this team), else the project's default list.
 */
export const resolveList = (mail: ProjectMail, listId?: string) =>
  listId ? Promise.resolve(listId) : ensureContactBook(mail);

/** Starter document for a new campaign or template (must carry the unsubscribe link). */
export const starterContent = (businessName: string) =>
  JSON.stringify({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Hello!" }] },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Write your update here." }],
      },
      {
        type: "unsubscribeFooter",
        attrs: { component: "unsubscribeFooter" },
        content: [
          {
            type: "text",
            text: `You are receiving this email because you subscribed to ${businessName}. `,
          },
          {
            type: "text",
            marks: [{ type: "link", attrs: { href: "{{usesend_unsubscribe_url}}" } }],
            text: "Unsubscribe",
          },
        ],
      },
    ],
  });
