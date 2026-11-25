import "server-only";

import type { MercuryInvite, MercuryRecipient, MercuryTransaction } from "./mercury-shared";

// ─── Mercury API client (server) ─────────────────────────────────
// A Custom API token with recipients (read + invite) and transactions (read)
// scopes only: nothing here can move money. MERCURY_API_BASE points local
// runs at the sandbox (https://api-sandbox.mercury.com/api/v1).
// Tokens unused for 45 days are deleted by Mercury; approvals keep it alive.

const BASE = () => (process.env.MERCURY_API_BASE || "https://api.mercury.com/api/v1").replace(/\/$/, "");

export const isMercuryConfigured = () => Boolean(process.env.MERCURY_API_TOKEN);

/** Mercury wants the "secret-token:" prefix in the header; the dashboard shows the token with it, people paste it without. */
const bearer = (token: string) => (token.startsWith("secret-token:") ? token : `secret-token:${token}`);

async function mercuryFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.MERCURY_API_TOKEN?.trim();
  if (!token) throw new Error("MERCURY_API_TOKEN is not set");
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${bearer(token)}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mercury ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/**
 * Invites someone to add their own bank details (and W-9) on Mercury's
 * form. Mercury emails the link; `recipientId` re-invites an existing recipient.
 */
export const createRecipientInvite = (input: {
  name: string;
  contactEmail: string;
  recipientId?: string | null;
  notes?: string;
}) =>
  mercuryFetch<MercuryInvite>("/recipients/invites", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      contactEmail: input.contactEmail,
      paymentMethods: ["ach"],
      requireTaxDocument: true,
      sendEmail: true,
      organizationNameOnRequest: "Ali Samadii LLC",
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.recipientId ? { recipientId: input.recipientId } : {}),
    }),
  });

export const getRecipientInvite = (inviteId: string) =>
  mercuryFetch<MercuryInvite>(`/recipients/invites/${encodeURIComponent(inviteId)}`);

export const getRecipient = (recipientId: string) =>
  mercuryFetch<MercuryRecipient>(`/recipient/${encodeURIComponent(recipientId)}`);

export const getTransaction = (transactionId: string) =>
  mercuryFetch<MercuryTransaction>(`/transaction/${encodeURIComponent(transactionId)}`);
