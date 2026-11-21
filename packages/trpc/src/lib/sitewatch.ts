import "server-only";

import { TRPCError } from "@trpc/server";

import type {
  SitewatchEndpoint,
  SitewatchIncident,
  SitewatchPage,
  SitewatchRun,
  SitewatchSite,
  SitewatchUptime,
} from "./sitewatch-shared";

// Site Monitor reads the agency's sitewatch (agency-toolkit/apps/sitewatch)
// over its /api/v1 API with one owner key (SITEWATCH_API_KEY on the api
// service). Sites are addressed by domain, www-insensitive, so the hub keeps
// no sitewatch ids: hub_project.website_url is the link.

const baseUrl = () => (process.env.SITEWATCH_URL || "https://site-monitor.alisamadii.com").replace(/\/$/, "");

export const isSitewatchConfigured = () => Boolean(process.env.SITEWATCH_API_KEY);

export class SitewatchError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function sitewatch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env.SITEWATCH_API_KEY;
  if (!key) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Site Monitor isn't configured (SITEWATCH_API_KEY)." });
  }
  const res = await fetch(`${baseUrl()}/api/v1${path}`, {
    method: init.method ?? "GET",
    headers: {
      "x-api-key": key,
      Accept: "application/json",
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new SitewatchError(json.error || `Site Monitor request failed (${res.status})`, res.status);
  return json;
}

const site = (host: string) => `/sites/${encodeURIComponent(host)}`;

/** The site's dashboard, or null when sitewatch doesn't monitor this domain. */
export async function getSite(host: string) {
  try {
    return await sitewatch<{ site: SitewatchSite; uptime: SitewatchUptime }>(site(host));
  } catch (error) {
    if (error instanceof SitewatchError && error.status === 404) return null;
    throw error;
  }
}

export const getPages = async (host: string) =>
  (await sitewatch<{ pages: SitewatchPage[] }>(`${site(host)}/pages`)).pages;

export const getEndpoints = async (host: string) =>
  (await sitewatch<{ endpoints: SitewatchEndpoint[] }>(`${site(host)}/endpoints`)).endpoints;

export const listRuns = async (host: string, limit = 30) =>
  (await sitewatch<{ runs: SitewatchRun[] }>(`/runs?site=${encodeURIComponent(host)}&limit=${limit}`)).runs;

/** Open problems, muted ones included (ignoredAt set). */
export const listIncidents = async (host: string) =>
  (
    await sitewatch<{ incidents: SitewatchIncident[] }>(
      `/incidents?site=${encodeURIComponent(host)}&include_muted=1`
    )
  ).incidents;

/** Starts monitoring; the first check runs in the background. */
export const createSite = (websiteUrl: string) =>
  sitewatch<{ id: string; name: string; baseUrl: string }>("/sites", { method: "POST", body: { url: websiteUrl } });

export const runCheck = (host: string) =>
  sitewatch<{ started: boolean; skipped: boolean }>(`${site(host)}/run`, { method: "POST" });

export const setIncidentMuted = (host: string, incidentId: string, muted: boolean) =>
  sitewatch<{ ok: true }>(`${site(host)}/incidents/${encodeURIComponent(incidentId)}/mute`, {
    method: muted ? "POST" : "DELETE",
  });
