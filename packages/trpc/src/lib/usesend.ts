import "server-only";

import { UseSendError, usesendFetch } from "@workspace/email/usesend";

// ─── Emails snapshot ─────────────────────────────────────────────
// The useSend list API filters by domainId (and dates) but has no free-text
// search, so the Emails tab works off a recent-window snapshot: newest-first
// pages up to LIST_CAP, cached briefly per domain so list/stats/PDF-export
// share a single fetch. Self-hosted instance — no meaningful rate limits.

export type UseSendEmailRow = {
  id: string;
  fromAddress: string;
  to: string[];
  subject: string;
  createdAt: string;
  /** Lowercased latestStatus: "sent" | "delivered" | "opened" | "bounced" | … */
  lastEvent: string;
  domainId: string | null;
};

export type UseSendEmailDetail = UseSendEmailRow & {
  html: string | null;
  text: string | null;
  emailEvents: { status: string; createdAt: string }[];
};

const LIST_CAP = 1000;
// useSend's list endpoint rejects limit > 50 (Zod-validated).
const PAGE_SIZE = 50;
const SNAPSHOT_TTL_MS = 30_000;

type ListedEmail = {
  id: string;
  to: string | string[];
  from: string;
  subject: string;
  createdAt: string;
  latestStatus?: string | null;
  domainId?: number | string | null;
};

const toArray = (value: string | string[]) =>
  Array.isArray(value) ? value : [value];

const toRow = (row: ListedEmail): UseSendEmailRow => ({
  id: row.id,
  fromAddress: row.from,
  to: toArray(row.to),
  subject: row.subject,
  createdAt: new Date(row.createdAt).toISOString(),
  lastEvent: (row.latestStatus ?? "sent").toLowerCase(),
  domainId: row.domainId == null ? null : String(row.domainId),
});

const snapshots = new Map<string, { at: number; emails: UseSendEmailRow[] }>();
const inflight = new Map<string, Promise<UseSendEmailRow[]>>();

// Each project is its own useSend team, so the team's API key both scopes the
// list (no domainId needed) and is the cache key. Omitting it falls back to the
// shared instance key (admin view of every send).
async function fetchSnapshot(apiKey?: string): Promise<UseSendEmailRow[]> {
  const rows: UseSendEmailRow[] = [];
  for (let page = 1; rows.length < LIST_CAP; page++) {
    const { data } = await usesendFetch<{ data: ListedEmail[]; count: number }>(
      "/api/v1/emails",
      { query: { page, limit: PAGE_SIZE }, apiKey }
    );
    if (!data || data.length === 0) break;
    rows.push(...data.map(toRow));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function getEmailsSnapshot(
  apiKey?: string
): Promise<UseSendEmailRow[]> {
  const key = apiKey ?? "*";

  const cached = snapshots.get(key);
  if (cached && Date.now() - cached.at < SNAPSHOT_TTL_MS) return cached.emails;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = fetchSnapshot(apiKey)
    .then((emails) => {
      snapshots.set(key, { at: Date.now(), emails });
      return emails;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export async function getEmailById(
  id: string,
  apiKey?: string
): Promise<UseSendEmailDetail | null> {
  type DetailResponse = ListedEmail & {
    html?: string | null;
    text?: string | null;
    emailEvents?: { status: string; createdAt: string }[];
  };

  let data: DetailResponse;
  try {
    // The detail endpoint is team-scoped: pass the project's own team key, or
    // the lookup hits the shared team and 404s on the project's emails.
    data = await usesendFetch<DetailResponse>(
      `/api/v1/emails/${encodeURIComponent(id)}`,
      { apiKey }
    );
  } catch (error) {
    if (error instanceof UseSendError && error.status === 404) return null;
    throw error;
  }

  const emailEvents = (data.emailEvents ?? []).map((e) => ({
    status: e.status.toLowerCase(),
    createdAt: new Date(e.createdAt).toISOString(),
  }));

  const row = toRow(data);
  return {
    ...row,
    // The detail endpoint has no latestStatus (and no domainId) — derive the
    // last event from the event log instead.
    lastEvent: emailEvents[emailEvents.length - 1]?.status ?? row.lastEvent,
    html: data.html ?? null,
    text: data.text ?? null,
    emailEvents,
  };
}

// ─── Sending domains (Emails tab connect flow) ───────────────────────────────
// The admin API key has full domain rights on the instance. Every response is
// narrowed to the fields below — raw rows carry DKIM public keys and internal
// SES state that must never travel past the router.

export type UseSendDnsRecord = {
  type: string;
  name: string;
  value: string;
  ttl?: string;
  priority?: string;
  status?: string | null;
};

export type UseSendDomain = {
  id: number;
  name: string;
  status: string;
  dkimStatus: string | null;
  spfDetails: string | null;
  isVerifying: boolean;
  dnsRecords: UseSendDnsRecord[];
};

type RawDomain = {
  id: number;
  name: string;
  status?: string;
  dkimStatus?: string | null;
  spfDetails?: string | null;
  isVerifying?: boolean;
  dnsRecords?: {
    type?: string;
    name?: string;
    value?: string;
    ttl?: string;
    priority?: string;
    status?: string | null;
  }[];
};

const toDomain = (raw: RawDomain): UseSendDomain => ({
  id: raw.id,
  name: raw.name,
  status: raw.status ?? "PENDING",
  dkimStatus: raw.dkimStatus ?? null,
  spfDetails: raw.spfDetails ?? null,
  isVerifying: raw.isVerifying ?? false,
  dnsRecords: (raw.dnsRecords ?? []).map((record) => ({
    type: record.type ?? "",
    name: record.name ?? "",
    value: record.value ?? "",
    ttl: record.ttl,
    priority: record.priority,
    status: record.status ?? null,
  })),
});

// Every helper takes an optional per-team `apiKey`; domains belong to the key's
// team. Omitted → the shared instance key (the agency's own team).
export async function listUsesendDomains(
  apiKey?: string
): Promise<UseSendDomain[]> {
  const rows = await usesendFetch<RawDomain[]>("/api/v1/domains", { apiKey });
  return (Array.isArray(rows) ? rows : []).map(toDomain);
}

/** The list endpoint is the one confirmed route — resolve single domains via it. */
export async function getUsesendDomain(
  id: number,
  apiKey?: string
): Promise<UseSendDomain | null> {
  const domains = await listUsesendDomains(apiKey);
  return domains.find((domain) => domain.id === id) ?? null;
}

// The instance's SES region — every existing domain on it is us-west-2.
export const USESEND_REGION = process.env.USESEND_REGION ?? "us-west-2";

export async function createUsesendDomain(
  name: string,
  apiKey?: string
): Promise<UseSendDomain> {
  const raw = await usesendFetch<RawDomain>("/api/v1/domains", {
    method: "POST",
    body: { name, region: USESEND_REGION },
    apiKey,
  });
  return toDomain(raw);
}

/** Best-effort verification trigger — useSend re-checks SES on its own too. */
export async function verifyUsesendDomain(
  id: number,
  apiKey?: string
): Promise<void> {
  try {
    await usesendFetch(`/api/v1/domains/${id}/verify`, { method: "PUT", apiKey });
  } catch (error) {
    if (
      error instanceof UseSendError &&
      (error.status === 404 || error.status === 405)
    )
      return;
    throw error;
  }
}

export async function deleteUsesendDomain(
  id: number,
  apiKey?: string
): Promise<void> {
  try {
    await usesendFetch(`/api/v1/domains/${id}`, { method: "DELETE", apiKey });
  } catch (error) {
    if (
      error instanceof UseSendError &&
      (error.status === 404 || error.status === 405)
    )
      return;
    throw error;
  }
}

export const isDomainVerified = (domain: UseSendDomain): boolean =>
  domain.status === "SUCCESS" &&
  domain.dkimStatus === "SUCCESS" &&
  domain.spfDetails === "SUCCESS";
