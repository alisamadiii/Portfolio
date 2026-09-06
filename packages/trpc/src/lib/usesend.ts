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

async function fetchSnapshot(domainId?: string): Promise<UseSendEmailRow[]> {
  const rows: UseSendEmailRow[] = [];
  for (let page = 1; rows.length < LIST_CAP; page++) {
    const { data } = await usesendFetch<{ data: ListedEmail[]; count: number }>(
      "/api/v1/emails",
      { query: { page, limit: PAGE_SIZE, domainId } }
    );
    if (!data || data.length === 0) break;
    rows.push(...data.map(toRow));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function getEmailsSnapshot(
  domainId?: string
): Promise<UseSendEmailRow[]> {
  const key = domainId ?? "*";

  const cached = snapshots.get(key);
  if (cached && Date.now() - cached.at < SNAPSHOT_TTL_MS) return cached.emails;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = fetchSnapshot(domainId)
    .then((emails) => {
      snapshots.set(key, { at: Date.now(), emails });
      return emails;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export async function getEmailById(
  id: string
): Promise<UseSendEmailDetail | null> {
  type DetailResponse = ListedEmail & {
    html?: string | null;
    text?: string | null;
    emailEvents?: { status: string; createdAt: string }[];
  };

  let data: DetailResponse;
  try {
    data = await usesendFetch<DetailResponse>(
      `/api/v1/emails/${encodeURIComponent(id)}`
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
