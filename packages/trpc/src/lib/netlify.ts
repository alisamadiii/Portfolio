import "server-only";

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import { deployToNetlify } from "./content-pilot";
import { getConnectedAccount, getIntegrationAccessToken } from "./integrations";

// ─── Netlify API ─────────────────────────────────────────────────
// Raw REST, no SDK. Upload projects publish to a Netlify site: the publishing
// user's own Netlify (OAuth link, account table) when connected, else the
// agency's personal access token. Which one owns a site is pinned on the
// project (hub_project.netlifyConnectedUserId) when the site is created.

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

/**
 * Who will own a NEW site: the caller when they linked Netlify, else the
 * agency. Null when neither is available (publish then skips the deploy).
 */
export async function netlifyOwnerForNewSite(
  userId: string
): Promise<{ token: string; connectedUserId: string | null } | null> {
  if (await getConnectedAccount(userId, "netlify")) {
    const token = await getIntegrationAccessToken(userId, "netlify", "Netlify");
    return { token, connectedUserId: userId };
  }
  const token = agencyToken();
  return token ? { token, connectedUserId: null } : null;
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
            : "INTERNAL_SERVER_ERROR",
      message:
        res.status === 401
          ? "Netlify needs to be reconnected."
          : `Netlify: ${body?.message ?? res.status}`,
    });
  }
  return (await res.json()) as T;
}

export type NetlifySite = {
  id: string;
  name: string;
  url: string;
  ssl_url: string | null;
  admin_url: string;
  custom_domain: string | null;
  ssl: boolean | null;
  created_at: string;
  published_deploy: { id: string; published_at: string | null } | null;
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

export const listNetlifyDeploys = (token: string, siteId: string) =>
  netlify<NetlifyDeploy[]>(token, `/sites/${siteId}/deploys?per_page=10`);

/**
 * Publishes an upload project's default branch to Netlify: creates the site on
 * the first deploy (owned by the caller's Netlify when linked, else the
 * agency), then queues the build + zip deploy on content-pilot. Returns
 * false when no Netlify token is available at all.
 */
export async function deployProjectToNetlify(
  projectId: string,
  userId: string
): Promise<boolean> {
  const [project] = await db
    .select({
      repo: hubProject.repo,
      websiteUrl: hubProject.websiteUrl,
      netlifySiteId: hubProject.netlifySiteId,
      netlifyConnectedUserId: hubProject.netlifyConnectedUserId,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });

  let siteId = project.netlifySiteId;
  let token: string;
  if (siteId) {
    token = await netlifyTokenFor(project);
  } else {
    const owner = await netlifyOwnerForNewSite(userId);
    if (!owner) return false;
    token = owner.token;
    const site = await createNetlifySite(token, project.repo);
    const url = site.ssl_url ?? site.url;
    siteId = site.id;
    await db
      .update(hubProject)
      .set({
        netlifySiteId: site.id,
        netlifySiteUrl: url,
        netlifyConnectedUserId: owner.connectedUserId,
        // Fill the live URL the rest of the hub uses, never overwrite one.
        ...(project.websiteUrl ? {} : { websiteUrl: url }),
      })
      .where(eq(hubProject.id, projectId));
  }

  await deployToNetlify({ projectId, siteId, token });
  return true;
}
