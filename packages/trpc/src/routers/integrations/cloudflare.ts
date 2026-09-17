import "server-only";

import { TRPCError } from "@trpc/server";

import { reconnectError } from "../../lib/integrations";

// ─── Cloudflare REST client ──────────────────────────────────────
// Raw-fetch helpers over the connected user's Cloudflare OAuth token, consumed
// by the domain (zones/DNS) and deploy (workers/pages import) routers.

const CF_BASE = "https://api.cloudflare.com/client/v4";

type CfEnvelope<T> = {
  success: boolean;
  errors?: { code?: number; message?: string }[];
  result: T;
};

async function cf<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${CF_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw reconnectError("Cloudflare");
  }
  const data = (await res.json().catch(() => null)) as CfEnvelope<T> | null;
  if (!res.ok || !data?.success) {
    const detail = data?.errors?.map((e) => e.message).join("; ") ?? "";
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: `Cloudflare API error (${res.status}): ${detail.slice(0, 300)}`,
    });
  }
  return data.result;
}

export type CfAccount = { id: string; name: string };

/** Accounts the token's user granted access to. */
export const listCfAccounts = (accessToken: string) =>
  cf<CfAccount[]>("/accounts?per_page=50", accessToken);

export type CfZone = { id: string; name: string; status: string };

/** Zones (domains) the token can read — all of them, or scoped to one account. */
export const listCfZones = (accessToken: string, accountId?: string) =>
  cf<CfZone[]>(
    accountId
      ? `/zones?account.id=${encodeURIComponent(accountId)}&per_page=100`
      : "/zones?per_page=100",
    accessToken
  );

export type CfDnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
};

export const listCfDnsRecords = (accessToken: string, zoneId: string) =>
  cf<CfDnsRecord[]>(`/zones/${zoneId}/dns_records?per_page=200`, accessToken);

export type CfDnsRecordInput = {
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
};

export const createCfDnsRecord = (
  accessToken: string,
  zoneId: string,
  record: CfDnsRecordInput
) =>
  cf<CfDnsRecord>(`/zones/${zoneId}/dns_records`, accessToken, {
    method: "POST",
    body: JSON.stringify(record),
  });

export const deleteCfDnsRecord = (
  accessToken: string,
  zoneId: string,
  recordId: string
) =>
  cf<{ id: string }>(`/zones/${zoneId}/dns_records/${recordId}`, accessToken, {
    method: "DELETE",
  });

export type CfWorker = { id: string; created_on?: string; modified_on?: string };

export const listCfWorkers = (accessToken: string, accountId: string) =>
  cf<CfWorker[]>(`/accounts/${accountId}/workers/scripts`, accessToken);

// ─── Workers Custom Domains (attach a hostname to a Worker) ───────

export type CfWorkerDomain = {
  id: string;
  hostname: string;
  service: string;
  zone_id: string;
  // "active" once the cert is issued and serving; else pending/initializing.
  status?: string;
};

/** Attach a hostname (in a zone on the account) to a Worker. CF creates the DNS record. */
export const attachWorkerDomain = (
  accessToken: string,
  accountId: string,
  input: { hostname: string; service: string; zoneId: string }
) =>
  cf<CfWorkerDomain>(`/accounts/${accountId}/workers/domains`, accessToken, {
    method: "PUT",
    body: JSON.stringify({
      hostname: input.hostname,
      service: input.service,
      zone_id: input.zoneId,
      environment: "production",
    }),
  });

export const getWorkerDomain = (
  accessToken: string,
  accountId: string,
  id: string
) =>
  cf<CfWorkerDomain>(`/accounts/${accountId}/workers/domains/${id}`, accessToken);

export const detachWorkerDomain = (
  accessToken: string,
  accountId: string,
  id: string
) =>
  cf<unknown>(`/accounts/${accountId}/workers/domains/${id}`, accessToken, {
    method: "DELETE",
  });

/** Delete a Worker script (the project's own Worker) — takes it offline. */
export const deleteWorkerScript = (
  accessToken: string,
  accountId: string,
  name: string
) =>
  cf<unknown>(
    `/accounts/${accountId}/workers/scripts/${encodeURIComponent(name)}`,
    accessToken,
    { method: "DELETE" }
  );

/** Find the account zone a hostname belongs to (longest matching suffix). */
export async function resolveZoneForHost(
  accessToken: string,
  accountId: string,
  hostname: string
): Promise<CfZone | null> {
  const zones = await listCfZones(accessToken, accountId);
  const matches = zones.filter(
    (z) => hostname === z.name || hostname.endsWith(`.${z.name}`)
  );
  matches.sort((a, b) => b.name.length - a.name.length);
  return matches[0] ?? null;
}

/** The account's *.workers.dev subdomain, e.g. "a-141" → <worker>.a-141.workers.dev. */
export const getWorkersDevSubdomain = (accessToken: string, accountId: string) =>
  cf<{ subdomain: string }>(
    `/accounts/${accountId}/workers/subdomain`,
    accessToken
  ).then((r) => r.subdomain);

/** Custom domains attached to a Worker (excludes the workers.dev route). */
export const getWorkerDomains = (
  accessToken: string,
  accountId: string,
  name: string
) =>
  cf<{ hostname: string }[]>(
    `/accounts/${accountId}/workers/domains?service=${encodeURIComponent(name)}`,
    accessToken
  ).then((rows) => rows.map((r) => r.hostname));

type CfPagesListItem = {
  name: string;
  subdomain?: string;
  source?: { config?: { owner?: string; repo_name?: string } };
};

export type CfPagesSummary = {
  name: string;
  subdomain: string | null;
  repo: { owner: string; repo: string } | null;
};

/** All Pages projects on the account, with their git source + pages.dev host. */
export const listPagesProjects = (accessToken: string, accountId: string) =>
  cf<CfPagesListItem[]>(
    `/accounts/${accountId}/pages/projects?per_page=100`,
    accessToken
  ).then((rows) =>
    rows.map<CfPagesSummary>((p) => ({
      name: p.name,
      subdomain: p.subdomain ?? null,
      repo:
        p.source?.config?.owner && p.source?.config?.repo_name
          ? { owner: p.source.config.owner, repo: p.source.config.repo_name }
          : null,
    }))
  );

/** Custom domains on a Pages project (excludes the pages.dev host). */
export const getPagesProjectDomains = (
  accessToken: string,
  accountId: string,
  name: string
) =>
  cf<{ name: string }[]>(
    `/accounts/${accountId}/pages/projects/${encodeURIComponent(name)}/domains`,
    accessToken
  ).then((rows) => rows.map((r) => r.name));

/** Production + preview workers.dev URLs for a Worker on this account. */
export async function getWorkerUrls(
  accessToken: string,
  accountId: string,
  name: string
): Promise<{ production: string; preview: string }> {
  const sub = await getWorkersDevSubdomain(accessToken, accountId);
  return {
    production: `https://${name}.${sub}.workers.dev`,
    // CF exposes previews as the wildcard <alias>-<name>.<sub>.workers.dev.
    preview: `https://*-${name}.${sub}.workers.dev`,
  };
}

