/**
 * Vercel project-domain helpers. The Vercel API is the source of truth;
 * syncDomainsForRepo is the single write path into cms_domain (state-sync,
 * same pattern as the Stripe webhook) — the tRPC mutations, the Refresh
 * button and the Vercel webhook all funnel through it.
 */

import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubDomain, hubProject } from "@workspace/drizzle/schema";
import { vercelFetch } from "@workspace/trpc/lib/vercel/client";

type VercelVerification = {
  type: string;
  domain: string;
  value: string;
  reason: string;
};

type VercelDomain = {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  redirect?: string | null;
  redirectStatusCode?: number | null;
  gitBranch?: string | null;
  verification?: VercelVerification[];
  createdAt?: number;
};

type VercelDomainConfig = {
  misconfigured: boolean;
  recommendedCNAME?: unknown;
  recommendedIPv4?: unknown;
  [key: string]: unknown;
};

type VercelProject = {
  id: string;
  name: string;
  link?: { type: string; repoId?: number };
};

// ----- Raw API calls ---------------------------------------------------------

const listProjectDomains = (projectId: string) =>
  vercelFetch<{ domains: VercelDomain[] }>(
    `/v9/projects/${projectId}/domains`,
    { searchParams: { limit: "100" } }
  ).then((res) => res.domains);

const addProjectDomain = (
  projectId: string,
  domain: {
    name: string;
    redirect?: string | null;
    redirectStatusCode?: number | null;
    gitBranch?: string | null;
  }
) =>
  vercelFetch<VercelDomain>(`/v10/projects/${projectId}/domains`, {
    method: "POST",
    body: domain,
  });

const deleteProjectDomain = (projectId: string, domain: string) =>
  vercelFetch<unknown>(`/v9/projects/${projectId}/domains/${domain}`, {
    method: "DELETE",
  });

const updateProjectDomain = (
  projectId: string,
  domain: string,
  patch: {
    redirect?: string | null;
    redirectStatusCode?: number | null;
    gitBranch?: string | null;
  }
) =>
  vercelFetch<VercelDomain>(`/v9/projects/${projectId}/domains/${domain}`, {
    method: "PATCH",
    body: patch,
  });

const verifyProjectDomain = (projectId: string, domain: string) =>
  vercelFetch<VercelDomain>(
    `/v9/projects/${projectId}/domains/${domain}/verify`,
    { method: "POST" }
  );

const getDomainConfig = (domain: string) =>
  vercelFetch<VercelDomainConfig>(`/v6/domains/${domain}/config`);

// ----- Project discovery -----------------------------------------------------

/**
 * Resolve (and cache) the Vercel project id for a repo. Vercel projects
 * connected to GitHub carry `link.repoId` = the GitHub repository id, which is
 * exactly our hubProject.repoId — so discovery needs no manual mapping.
 */
const resolveVercelProjectId = async (repoId: number): Promise<string> => {
  const [row] = await db
    .select({ vercelProjectId: hubProject.vercelProjectId })
    .from(hubProject)
    .where(eq(hubProject.repoId, repoId))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  if (row.vercelProjectId) return row.vercelProjectId;

  // Paginate the team's projects looking for the GitHub link match.
  let until: number | undefined;
  while (true) {
    const res = await vercelFetch<{
      projects: VercelProject[];
      pagination?: { next?: number | null };
    }>("/v9/projects", {
      searchParams: {
        limit: "100",
        ...(until ? { until: String(until) } : {}),
      },
    });

    const match = res.projects.find(
      (p) => p.link?.type === "github" && p.link.repoId === repoId
    );
    if (match) {
      await db
        .update(hubProject)
        .set({ vercelProjectId: match.id })
        .where(eq(hubProject.repoId, repoId));
      return match.id;
    }

    const next = res.pagination?.next;
    if (!next || res.projects.length === 0) break;
    until = next;
  }

  throw new TRPCError({
    code: "NOT_FOUND",
    message: "No Vercel project linked to this repository",
  });
};

// ----- State sync ------------------------------------------------------------

/**
 * Re-fetch every domain of the repo's Vercel project (plus its DNS config)
 * and replace the cms_domain rows wholesale. Returns the fresh rows.
 */
const syncDomainsForRepo = async (repoId: number) => {
  const projectId = await resolveVercelProjectId(repoId);
  const domains = await listProjectDomains(projectId);

  const configs = await Promise.all(
    domains.map((d) => getDomainConfig(d.name).catch(() => null))
  );

  const syncedAt = new Date();
  const values = domains.map((d, i) => ({
    repoId,
    domain: d.name.toLowerCase(),
    apexName: d.apexName,
    verified: d.verified,
    misconfigured: configs[i]?.misconfigured ?? null,
    redirect: d.redirect ?? null,
    redirectStatusCode: d.redirectStatusCode ?? null,
    gitBranch: d.gitBranch ?? null,
    verification: d.verification ?? null,
    dnsConfig: configs[i] ?? null,
    vercelCreatedAt: d.createdAt ? new Date(d.createdAt) : null,
    syncedAt,
  }));

  await db.delete(hubDomain).where(eq(hubDomain.repoId, repoId));
  if (values.length) await db.insert(hubDomain).values(values);

  return db.select().from(hubDomain).where(eq(hubDomain.repoId, repoId));
};

// ----- Site URL derivation ---------------------------------------------------

type DomainRow = typeof hubDomain.$inferSelect;

/**
 * The domain the hub shows as "the site": a verified production custom domain
 * first (apex preferred, then shortest), else the verified *.vercel.app one.
 */
const pickPrimaryDomain = (rows: DomainRow[]): DomainRow | null => {
  const production = rows.filter(
    (r) => r.verified && !r.redirect && !r.gitBranch
  );
  const custom = production
    .filter((r) => !r.domain.endsWith(".vercel.app"))
    .sort((a, b) => {
      const aApex = a.domain === a.apexName ? 0 : 1;
      const bApex = b.domain === b.apexName ? 0 : 1;
      return aApex - bApex || a.domain.length - b.domain.length;
    });
  return custom[0] ?? production.find((r) => r.domain.endsWith(".vercel.app")) ?? null;
};

const deriveWebsiteUrl = (rows: DomainRow[]): string | null => {
  const primary = pickPrimaryDomain(rows);
  return primary ? `https://${primary.domain}` : null;
};

/**
 * Batch: derived website URL per repoId (one query for N repos). Repos with
 * no domain rows are simply absent from the map.
 */
const getWebsiteUrlsByRepoId = async (
  repoIds: number[]
): Promise<Map<number, string | null>> => {
  if (repoIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(hubDomain)
    .where(inArray(hubDomain.repoId, repoIds));

  const byRepoId = new Map<number, DomainRow[]>();
  for (const row of rows) {
    const list = byRepoId.get(row.repoId) ?? [];
    list.push(row);
    byRepoId.set(row.repoId, list);
  }

  return new Map(
    [...byRepoId.entries()].map(([repoId, domainRows]) => [
      repoId,
      deriveWebsiteUrl(domainRows),
    ])
  );
};

export {
  addProjectDomain,
  deleteProjectDomain,
  deriveWebsiteUrl,
  getDomainConfig,
  getWebsiteUrlsByRepoId,
  listProjectDomains,
  pickPrimaryDomain,
  resolveVercelProjectId,
  syncDomainsForRepo,
  updateProjectDomain,
  verifyProjectDomain,
};
export type { DomainRow, VercelDomain, VercelDomainConfig };
