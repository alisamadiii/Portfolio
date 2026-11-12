import "server-only";

import { UseSendError, usesendFetch } from "@workspace/email/usesend";

// ─── Single email lookup ─────────────────────────────────────────
// Backs the hub's /e/[id] short link (emails.getById / getViewUrlById).

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
