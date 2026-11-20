import "server-only";

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { agencyClient, hubProject } from "@workspace/drizzle/schema";

import { isAdminUser } from "./authz-shared";
import { deployToNetlify } from "./content-pilot";
import { getConnectedAccount, getIntegrationAccessToken } from "./integrations";
import { type NetlifyPlan, planNetlifyHost } from "./netlify-shared";

// ─── Netlify API ─────────────────────────────────────────────────
// Raw REST, no SDK. Upload projects publish to a Netlify site linked to the
// project. Which account owns the site is pinned on the project
// (hub_project.netlifyConnectedUserId, null = agency) and every publish uses
// that account's token, whoever clicks (planNetlifyHost). The agency token
// never reaches clients for site settings (netlifyWriteTokenFor).

const BASE = "https://api.netlify.com/api/v1";

const agencyToken = () => process.env.NETLIFY_AGENCY_TOKEN || null;

/** Token for an existing site: its connected user's, else the agency PAT. */
export async function netlifyTokenFor(project: {
  netlifyConnectedUserId: string | null;
}): Promise<string> {
  if (project.netlifyConnectedUserId) {
    return getIntegrationAccessToken(
      project.netlifyConnectedUserId,
      "netlify",
      "Netlify"
    );
  }
  const token = agencyToken();
  if (!token) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Netlify is not configured on this server.",
    });
  }
  return token;
}

type Caller = { id: string; role?: string | null; isAdmin?: boolean };

/**
 * Token for changing an existing site. A site on the agency's Netlify (no
 * connected user) is managed by the agency: only an admin may change it, so a
 * client can never use the agency token for domains, snippets or env vars.
 */
export async function netlifyWriteTokenFor(
  project: { netlifyConnectedUserId: string | null },
  caller: Caller
): Promise<string> {
  if (!project.netlifyConnectedUserId && !isAdminUser(caller)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This site is managed by our team. Ask us to make this change.",
    });
  }
  return netlifyTokenFor(project);
}

/**
 * A project owner whose Netlify is connected: the importer first, then the
 * agency account owner(s). Null when none has connected Netlify.
 */
export async function projectOwnerNetlifyUserId(
  projectId: string
): Promise<string | null> {
  const [project] = await db
    .select({ ownerId: hubProject.githubConnectedUserId })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  const agencyOwners = await db
    .select({ userId: agencyClient.userId })
    .from(agencyClient)
    .where(eq(agencyClient.projectId, projectId));
  const owners = [
    project?.ownerId ?? null,
    ...agencyOwners.map((row) => row.userId),
  ].filter((id, i, all): id is string => !!id && all.indexOf(id) === i);
  for (const userId of owners) {
    if (await getConnectedAccount(userId, "netlify")) return userId;
  }
  return null;
}

/** Where a publish deploys right now. Project row only; the caller only matters
 *  for creating a site on the agency account (admins). No Netlify call. */
export async function netlifyPlan(
  projectId: string,
  caller: Caller
): Promise<NetlifyPlan> {
  const [project] = await db
    .select({
      netlifySiteId: hubProject.netlifySiteId,
      netlifyConnectedUserId: hubProject.netlifyConnectedUserId,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });
  return planNetlifyHost({
    siteExists: !!project.netlifySiteId,
    pinnedUserId: project.netlifyConnectedUserId,
    ownerConnectedUserId: project.netlifySiteId
      ? null
      : await projectOwnerNetlifyUserId(projectId),
    callerIsAdmin: isAdminUser(caller),
  });
}

async function netlify<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new TRPCError({
      code:
        res.status === 401
          ? "PRECONDITION_FAILED"
          : res.status === 404
            ? "NOT_FOUND"
            : res.status === 422
              ? "BAD_REQUEST"
              : "INTERNAL_SERVER_ERROR",
      message:
        res.status === 401
          ? "Netlify needs to be reconnected."
          : `Netlify: ${body?.message ?? res.status}`,
    });
  }
  // 204 (updates, deletes) has no body.
  return (await res.json().catch(() => undefined)) as T;
}

export type NetlifySite = {
  id: string;
  account_id: string;
  name: string;
  url: string;
  ssl_url: string | null;
  admin_url: string;
  custom_domain: string | null;
  ssl: boolean | null;
  created_at: string;
  published_deploy: { id: string; published_at: string | null } | null;
  account_slug?: string;
  domain_aliases?: string[] | null;
  force_ssl?: boolean | null;
  managed_dns?: boolean | null;
  processing_settings?: { html?: { pretty_urls?: boolean } } | null;
};

export type NetlifyDeploy = {
  id: string;
  state: string;
  created_at: string;
  published_at: string | null;
  deploy_time: number | null;
  title: string | null;
  error_message: string | null;
  deploy_ssl_url: string | null;
};

/** Netlify site names are global; the API rejects a taken one with 422. */
const siteSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "site";

/** Creates a site, retrying with a random suffix when the name is taken. */
export async function createNetlifySite(
  token: string,
  name: string
): Promise<NetlifySite> {
  const base = siteSlug(name);
  for (const candidate of [
    base,
    `${base}-${Math.random().toString(36).slice(2, 7)}`,
  ]) {
    try {
      return await netlify<NetlifySite>(token, "/sites", {
        method: "POST",
        body: JSON.stringify({ name: candidate }),
      });
    } catch (error) {
      if (candidate !== base) throw error;
    }
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}

export const getNetlifySite = (token: string, siteId: string) =>
  netlify<NetlifySite>(token, `/sites/${siteId}`);

/** Every site the token can see (first 100, newest first). */
export const listNetlifySites = (token: string) =>
  netlify<NetlifySite[]>(token, "/sites?filter=all&sort_by=created_at&per_page=100");

/** The agency PAT, or null when it isn't configured. */
export const netlifyAgencyToken = agencyToken;

/**
 * Sets a site-scoped env var (all deploy contexts): updates it when it
 * exists, creates it otherwise. Applies to the next deploy.
 */
export async function setNetlifySiteEnv(
  token: string,
  site: Pick<NetlifySite, "id" | "account_id">,
  key: string,
  value: string
) {
  const values = [{ value, context: "all" }];
  const base = `/accounts/${site.account_id}/env`;
  const query = `?site_id=${site.id}`;
  try {
    await netlify(token, `${base}/${key}${query}`, {
      method: "PUT",
      body: JSON.stringify({ key, scopes: ["builds", "functions", "runtime"], values }),
    });
  } catch (error) {
    if (!(error instanceof TRPCError) || error.code !== "NOT_FOUND") throw error;
    await netlify(token, `${base}${query}`, {
      method: "POST",
      body: JSON.stringify([{ key, scopes: ["builds", "functions", "runtime"], values }]),
    });
  }
}

export const listNetlifyDeploys = (token: string, siteId: string) =>
  netlify<NetlifyDeploy[]>(token, `/sites/${siteId}/deploys?per_page=10`);

export type NetlifyDeployStatus = "deploying" | "needs_netlify";

/**
 * Publishes an upload project's default branch to Netlify per netlifyPlan:
 * creates the site on the first deploy, then queues the build + deploy on
 * content-pilot. Returns "needs_netlify" instead of throwing when the
 * project has no site and no owner Netlify, so publish can still land the edits.
 */
export async function deployProjectToNetlify(
  projectId: string,
  caller: Caller
): Promise<NetlifyDeployStatus> {
  const plan = await netlifyPlan(projectId, caller);
  if (plan.action !== "deploy") return plan.action;

  const [project] = await db
    .select({
      repo: hubProject.repo,
      websiteUrl: hubProject.websiteUrl,
      netlifySiteId: hubProject.netlifySiteId,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });

  const token = await netlifyTokenFor({ netlifyConnectedUserId: plan.tokenUserId });
  let siteId = project.netlifySiteId;
  if (!siteId) {
    const site = await createNetlifySite(token, project.repo);
    const url = site.ssl_url ?? site.url;
    siteId = site.id;
    await db
      .update(hubProject)
      .set({
        netlifySiteId: site.id,
        netlifySiteUrl: url,
        netlifyConnectedUserId: plan.tokenUserId,
        // Fill the live URL the rest of the hub uses, never overwrite one.
        ...(project.websiteUrl ? {} : { websiteUrl: url }),
      })
      .where(eq(hubProject.id, projectId));
  }

  await deployToNetlify({ projectId, siteId, token });
  return "deploying";
}

// ─── Team plan & usage ───────────────────────────────────────────

type Capability = { included?: number | null; used?: number | null };

// Credit-based plans report credits in capabilities.credits (not in the
// OpenAPI spec, but returned by GET /accounts/{id}).
export type NetlifyAccount = {
  id: string;
  name: string;
  slug: string;
  type_name?: string | null;
  billing_period?: string | null;
  next_usage_period_start?: string | null;
  next_billing_period_start?: string | null;
  auto_topup_enabled?: boolean | null;
  usages_exceeded?: boolean | null;
  capabilities?: {
    sites?: Capability;
    collaborators?: Capability;
    credits?: Capability;
  } | null;
};

export const getNetlifyAccount = (token: string, accountId: string) =>
  netlify<NetlifyAccount>(token, `/accounts/${accountId}`);

type BuildStatus = {
  minutes?: {
    current?: number | null;
    included_minutes?: string | number | null;
    period_end_date?: string | null;
  } | null;
};

/** Build minutes this period (no /accounts prefix; object, or array in the spec). */
export const getNetlifyBuildMinutes = async (token: string, accountId: string) => {
  const res = await netlify<BuildStatus | BuildStatus[]>(token, `/${accountId}/builds/status`);
  return (Array.isArray(res) ? res[0] : res)?.minutes ?? null;
};

// ─── Domains & HTTPS ─────────────────────────────────────────────

export const updateNetlifySite = (
  token: string,
  siteId: string,
  patch: Partial<
    Pick<NetlifySite, "custom_domain" | "domain_aliases" | "force_ssl" | "processing_settings">
  >
) =>
  netlify<NetlifySite>(token, `/sites/${siteId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export type NetlifyCertificate = {
  state?: string | null;
  domains?: string[] | null;
  expires_at?: string | null;
};

/** The site's certificate, or null when it has none. */
export const getNetlifySsl = (token: string, siteId: string) =>
  netlify<NetlifyCertificate>(token, `/sites/${siteId}/ssl`).catch((error) => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") return null;
    throw error;
  });

/** Starts a Let's Encrypt certificate; Netlify answers 422 while DNS is wrong. */
export async function provisionNetlifySsl(token: string, siteId: string) {
  try {
    await netlify(token, `/sites/${siteId}/ssl`, { method: "POST" });
  } catch (error) {
    if (!(error instanceof TRPCError) || error.code !== "BAD_REQUEST") throw error;
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: /custom domain/i.test(error.message) && /no /i.test(error.message)
        ? "Add a custom domain first."
        : "Your domain isn't pointing to Netlify yet. Set the DNS records below, wait a few minutes, then try again.",
    });
  }
}

export type NetlifyDnsZone = { name: string; dns_servers?: string[] | null; errors?: string[] | null };

export const getNetlifySiteDns = (token: string, siteId: string) =>
  netlify<NetlifyDnsZone[]>(token, `/sites/${siteId}/dns`).catch(() => [] as NetlifyDnsZone[]);

// ─── Snippet injection ───────────────────────────────────────────

export type NetlifySnippet = {
  id: number;
  title: string;
  general: string;
  general_position: "head" | "footer";
};

export const listNetlifySnippets = async (token: string, siteId: string) =>
  (await netlify<NetlifySnippet[]>(token, `/sites/${siteId}/snippets`)) ?? [];

export const createNetlifySnippet = (
  token: string,
  siteId: string,
  snippet: { title: string; general: string; general_position: "head" | "footer" }
) =>
  netlify<NetlifySnippet>(token, `/sites/${siteId}/snippets`, {
    method: "POST",
    body: JSON.stringify(snippet),
  });

export const deleteNetlifySnippet = (token: string, siteId: string, id: number) =>
  netlify(token, `/sites/${siteId}/snippets/${id}`, { method: "DELETE" });
