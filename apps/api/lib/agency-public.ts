import { createElement } from "react";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/drizzle/pool";
import {
  agencyClient,
  agencyRateLimit,
  hubProject,
  user as userTable,
} from "@workspace/drizzle/schema";
import AgencyLeadEmail from "@workspace/email/emails/agency-lead";
import { renderEmailParts } from "@workspace/email/utils";
import { IP_LIMIT } from "@workspace/trpc/lib/agency/lead-capture";

// ─── Shared plumbing for the public agency endpoints ─────────────
// The form capture (forms/[projectId]) and contact (contact/[projectId]) routes
// are both reachable from visitors' browsers on clients' websites: same CORS
// shape, same origin allowlist, same Postgres rate limiter, same client
// lookup by form key, same notification email shell.

export const corsHeaders = (
  origin: string | null,
  methods = "POST, OPTIONS"
) => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Access-Control-Allow-Methods": methods,
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
});

// ─── Rate limit ─────────────────────────────────────────────────
// Fixed window in Postgres so every serverless instance shares the count.
// The Origin check below only stops other websites; a script can fake it,
// so this and the per-form caps are what actually limit abuse.

export const isRateLimited = async (key: string, max = IP_LIMIT.max) => {
  const windowStart = new Date(Date.now() - IP_LIMIT.windowMs);
  const [row] = await db
    .insert(agencyRateLimit)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: agencyRateLimit.key,
      set: {
        // Restart the window once it has expired, otherwise count up.
        count: sql`case when ${agencyRateLimit.windowStart} < ${windowStart} then 1 else ${agencyRateLimit.count} + 1 end`,
        windowStart: sql`case when ${agencyRateLimit.windowStart} < ${windowStart} then now() else ${agencyRateLimit.windowStart} end`,
      },
    })
    .returning({ count: agencyRateLimit.count });
  return (row?.count ?? 0) > max;
};

// Set by Vercel itself; x-forwarded-for's first entry can be sent by the client.
export const clientIp = (req: Request) =>
  req.headers.get("x-real-ip") ??
  req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
  req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
  "unknown";

// ─── Origin check ───────────────────────────────────────────────

export { hostOf } from "@workspace/trpc/lib/agency/origins";
import { hostOf, isOriginAllowed } from "@workspace/trpc/lib/agency/origins";

const withoutWww = (host: string) => host.replace(/^www\./, "");

/**
 * The request may post from a host on the client's own `origins` list, or the
 * host of its website URL (www-insensitive). Dev bypasses the check entirely.
 */
export const isAllowedOrigin = (
  origin: string | null,
  client: { origins: string[] | null; websiteUrl: string | null }
) => {
  const host = hostOf(origin);
  if (!host) return false;
  if (process.env.NODE_ENV !== "production") return true;

  // The explicit allow-list the user manages in the hub (hub_project.origins),
  // shared by the website Domain card and the agency settings card.
  if (isOriginAllowed(client.origins, host)) return true;

  const site = hostOf(client.websiteUrl);
  return Boolean(site && withoutWww(site) === withoutWww(host));
};

// ─── Client lookup ──────────────────────────────────────────────

/**
 * The agency client behind a public `projectId`; null when unknown. The embed
 * scripts (leads.js / contact.js) post keyed by the project's projectId — the tenant
 * id (`agency_client.projectId`), which is the project (`hub_project.projectId`). The
 * website is left-joined to keep its URL + name, plus the project's useSend
 * team key for the contact-email endpoint (server-only, never returned past these
 * routes). There is no separate public key: abuse is bounded by the origins
 * allowlist + the rate limiter.
 */
export async function findClientByProjectId(projectId: string) {
  const [client] = await db
    .select({
      projectId: agencyClient.projectId,
      userId: agencyClient.userId,
      origins: hubProject.origins,
      notifyEmail: hubProject.notifyEmail,
      ownerEmail: userTable.email,
      websiteUrl: hubProject.websiteUrl,
      repo: hubProject.repo,
      usesendApiKey: hubProject.usesendApiKey,
      googleAdsCustomerId: agencyClient.googleAdsCustomerId,
      googleAdsActions: agencyClient.googleAdsActions,
    })
    .from(agencyClient)
    .innerJoin(userTable, eq(userTable.id, agencyClient.userId))
    .leftJoin(hubProject, eq(hubProject.id, agencyClient.projectId))
    .where(eq(agencyClient.projectId, projectId))
    .limit(1);
  // A client with no tenant id can't store leads; treat as not found.
  if (!client || client.projectId == null) return null;
  return client as typeof client & { projectId: string };
}

/**
 * The contact-form target behind a public `projectId`; null when the project is
 * unknown. Unlike findClientByProjectId this does NOT require an agency_client row
 * — the contact script is a plain per-project website feature, so it resolves
 * from hub_project (origins, website URL, the project's useSend team) and the
 * project owner's email, with the agency lead-notify email as an optional
 * override. Server-only; never returned past the contact route.
 */
export async function findContactClientByProjectId(projectId: string) {
  const [client] = await db
    .select({
      projectId: hubProject.id,
      origins: hubProject.origins,
      websiteUrl: hubProject.websiteUrl,
      repo: hubProject.repo,
      usesendApiKey: hubProject.usesendApiKey,
      notifyEmail: hubProject.notifyEmail,
      ownerEmail: userTable.email,
    })
    .from(hubProject)
    .leftJoin(userTable, eq(userTable.id, hubProject.githubConnectedUserId))
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!client || client.projectId == null) return null;
  return client as typeof client & { projectId: string };
}

/** Parse a public embed `data-key` (the project's uuid, hub_project.id). */
export function parseProjectIdParam(value: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

// ─── Attribution payload (shared zod fragment) ──────────────────

const short = z.string().max(500).optional();

export const attributionSchema = z.object({
  pageUrl: z.string().max(2000).optional(),
  referrer: z.string().max(2000).optional(),
  landingPage: z.string().max(2000).optional(),
  firstTouch: z
    .object({
      referrer: z.string().max(1000).optional(),
      landing: z.string().max(1000).optional(),
      at: z.string().max(40).optional(),
    })
    .optional(),
  clickAt: z.string().max(40).optional(),
  gclid: short,
  gbraid: short,
  wbraid: short,
  utm: z
    .object({
      source: short,
      medium: short,
      campaign: short,
      id: short,
      term: short,
      content: short,
    })
    .optional(),
  // Honeypot: real visitors never fill it in.
  hp: z.string().max(500).optional(),
  // Milliseconds between page load and submit.
  t: z.number().int().nonnegative().optional(),
});

// ─── Notification email ─────────────────────────────────────────

/** html + text for a new-lead notification (packages/email agency-lead). */
export const leadEmail = (
  lines: [string, string][],
  leadUrl: string,
  siteName: string,
  opts?: { tag?: string; title?: string }
) =>
  renderEmailParts(
    createElement(AgencyLeadEmail, { lines, leadUrl, siteName, ...opts })
  );
