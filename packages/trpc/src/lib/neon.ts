import "server-only";

import { TRPCError } from "@trpc/server";

import { auth } from "@workspace/auth/auth";

import { reconnectError } from "./integrations";

// ─── Neon API (client's own account, via OAuth) ──────────────────
// Raw REST, no SDK. The project's Neon app lists/creates the client's Neon
// projects and reads branches, databases and connection strings, with the
// OAuth token of the user who connected Neon (hub_project.neonConnectedUserId).

const BASE = "https://console.neon.tech/api/v2";

// One token per linked Neon user, refreshes shared: a refresh may rotate the
// refresh token, and two concurrent ones would replay a spent token.
const cache = new Map<string, { token: string; exp: number }>();
const inflight = new Map<string, Promise<{ token: string; exp: number }>>();

const fetchToken = async (userId: string, accountId: string) => {
  try {
    const res = (await auth.api.getAccessToken({
      body: { providerId: "neon", userId, accountId },
    })) as { accessToken?: string; accessTokenExpiresAt?: Date | string } | null;
    if (!res?.accessToken) throw reconnectError("Neon");
    const exp = res.accessTokenExpiresAt
      ? new Date(res.accessTokenExpiresAt).getTime()
      : Date.now() + 5 * 60_000;
    return { token: res.accessToken, exp };
  } catch {
    throw reconnectError("Neon");
  }
};

export async function neonTokenFor(userId: string, accountId: string): Promise<string> {
  const key = `${userId}:${accountId}`;
  const hit = cache.get(key);
  if (hit && hit.exp - 60_000 > Date.now()) return hit.token;
  const pending = inflight.get(key);
  if (pending) return (await pending).token;
  const next = fetchToken(userId, accountId)
    .then((t) => {
      cache.set(key, t);
      return t;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, next);
  return (await next).token;
}

/** Drops the cached token (disconnect). */
export const forgetNeonToken = (userId: string, accountId: string) =>
  cache.delete(`${userId}:${accountId}`);

/** Ends the grant at Neon (revoking the refresh token revokes it all). */
export const revokeNeonGrant = (refreshToken: string) =>
  fetch("https://oauth2.neon.tech/oauth2/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.NEON_CLIENT_ID ?? "",
      client_secret: process.env.NEON_CLIENT_SECRET ?? "",
      token: refreshToken,
      token_type_hint: "refresh_token",
    }),
  }).catch(() => undefined);

async function neon<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new TRPCError({
      code:
        res.status === 401
          ? "PRECONDITION_FAILED"
          : res.status === 404
            ? "NOT_FOUND"
            : "INTERNAL_SERVER_ERROR",
      message:
        res.status === 401
          ? "Neon needs to be reconnected."
          : `Neon: ${body?.message ?? res.status}`,
    });
  }
  return (await res.json()) as T;
}

const q = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => !!e[1])
  ).toString();
  return s ? `?${s}` : "";
};

export type NeonOrg = { id: string; name: string };

export type NeonProject = {
  id: string;
  name: string;
  region_id: string;
  pg_version: number;
  created_at: string;
  org_id?: string | null;
  synthetic_storage_size?: number | null;
};

export type NeonBranch = {
  id: string;
  name: string;
  default?: boolean;
  primary?: boolean;
  current_state: string;
  logical_size?: number | null;
  created_at: string;
};

export type NeonEndpoint = {
  id: string;
  branch_id: string;
  type: string;
  current_state: string;
};

export type NeonDatabase = { id: number; name: string; owner_name: string };
export type NeonRole = { name: string; protected?: boolean };

export const listNeonOrgs = async (token: string) =>
  (await neon<{ organizations?: NeonOrg[] }>(token, "/users/me/organizations"))
    .organizations ?? [];

export const listNeonProjects = async (token: string, orgId?: string) =>
  (await neon<{ projects?: NeonProject[] }>(
    token,
    `/projects${q({ org_id: orgId, limit: "100" })}`
  )).projects ?? [];

export const getNeonProject = async (token: string, projectId: string) =>
  (await neon<{ project: NeonProject }>(token, `/projects/${encodeURIComponent(projectId)}`))
    .project;

export const createNeonProject = async (
  token: string,
  params: { name: string; regionId: string; orgId?: string }
) =>
  (await neon<{ project: NeonProject }>(token, "/projects", {
    method: "POST",
    body: JSON.stringify({
      project: { name: params.name, region_id: params.regionId, pg_version: 17 },
      ...(params.orgId ? { org_id: params.orgId } : {}),
    }),
  })).project;

export const listNeonBranches = async (token: string, projectId: string) =>
  (await neon<{ branches?: NeonBranch[] }>(
    token,
    `/projects/${encodeURIComponent(projectId)}/branches`
  )).branches ?? [];

export const listNeonEndpoints = async (token: string, projectId: string) =>
  (await neon<{ endpoints?: NeonEndpoint[] }>(
    token,
    `/projects/${encodeURIComponent(projectId)}/endpoints`
  )).endpoints ?? [];

export const listNeonDatabases = async (token: string, projectId: string, branchId: string) =>
  (await neon<{ databases?: NeonDatabase[] }>(
    token,
    `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}/databases`
  )).databases ?? [];

export const listNeonRoles = async (token: string, projectId: string, branchId: string) =>
  (await neon<{ roles?: NeonRole[] }>(
    token,
    `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}/roles`
  )).roles ?? [];

export const getNeonConnectionUri = async (
  token: string,
  projectId: string,
  params: { branchId: string; databaseName: string; roleName: string; pooled: boolean }
) =>
  (await neon<{ uri: string }>(
    token,
    `/projects/${encodeURIComponent(projectId)}/connection_uri${q({
      branch_id: params.branchId,
      database_name: params.databaseName,
      role_name: params.roleName,
      pooled: String(params.pooled),
    })}`
  )).uri;
