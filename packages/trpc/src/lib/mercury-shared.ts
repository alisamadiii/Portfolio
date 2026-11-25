import { createHmac, timingSafeEqual } from "crypto";

// ─── Mercury (bank) pure helpers: no I/O, unit-tested ────────────
// Only the fields the partner program reads are typed. Docs:
// https://docs.mercury.com/reference (recipients/invites, transactions, webhooks).

export type MercuryInviteStatus = "created" | "completed" | "expired" | "declined";

export type MercuryInvite = {
  id: string;
  onboardingUrl: string;
  status: MercuryInviteStatus;
  recipientId: string | null;
  expiresAt: string | null;
  name: string;
  contactEmail: string;
  createdAt: string;
};

export type MercuryRecipient = {
  id: string;
  status: "active" | "deleted";
  name: string;
  electronicRoutingInfo: { bankName?: string | null } | null;
};

export type MercuryTransactionStatus = "pending" | "sent" | "cancelled" | "failed" | "reversed" | "blocked";

export type MercuryTransaction = {
  id: string;
  amount: number;
  status: MercuryTransactionStatus;
  kind: string;
  counterpartyId: string | null;
  counterpartyName: string | null;
  createdAt: string;
  postedAt: string | null;
  dashboardLink: string | null;
  externalMemo: string | null;
};

/** Webhook body: an Events API record; we only read what identifies the resource. */
export type MercuryWebhookEvent = {
  id: string;
  resourceType: string;
  resourceId: string;
  operationType?: "create" | "update" | "delete";
  occurredAt?: string;
};

const safeEqual = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

/** Mercury rejects/retries by timestamp skew; 5 minutes is their recommendation. */
export const MERCURY_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * `Mercury-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>`, keyed with the
 * endpoint's secret over `${t}.${rawBody}`. Replays older than 5 minutes are rejected.
 */
export function verifyMercurySignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  now = Date.now()
): boolean {
  if (!header || !secret) return false;
  let timestamp: string | null = null;
  let signature: string | null = null;
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1") signature = value.toLowerCase();
  }
  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || !/^[0-9a-f]+$/.test(signature)) return false;
  if (Math.abs(now - Number(timestamp) * 1000) > MERCURY_SIGNATURE_MAX_AGE_MS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return safeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

/** Test helper and the shape Mercury sends: builds the header for a body. */
export function signMercuryPayload(rawBody: string, secret: string, now = Date.now()): string {
  const t = Math.floor(now / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

/**
 * Only money sent to a recipient can be a partner payout. Mercury lists
 * debits as negative amounts and sends via `outgoingPayment`.
 */
export const isOutgoingToRecipient = (t: Pick<MercuryTransaction, "kind" | "counterpartyId" | "amount">) =>
  !!t.counterpartyId && (t.kind === "outgoingPayment" || t.amount < 0);

export type PayoutCandidate = {
  id: number;
  commissionCents: number | null;
  partnerPaidAt: Date | string | null;
  mercuryTransactionId: string | null;
};

/**
 * The one owed referral a Mercury payment pays, or null when the match is
 * ambiguous (admin records it by hand). A row already carrying this
 * transaction id always wins, so status updates land on the same referral.
 */
export function matchPayoutReferral(
  transaction: Pick<MercuryTransaction, "id" | "amount">,
  referrals: PayoutCandidate[]
): PayoutCandidate | null {
  const same = referrals.find((r) => r.mercuryTransactionId === transaction.id);
  if (same) return same;
  const cents = Math.round(Math.abs(transaction.amount) * 100);
  const owed = referrals.filter(
    (r) => !r.partnerPaidAt && !r.mercuryTransactionId && r.commissionCents != null && r.commissionCents === cents
  );
  return owed.length === 1 ? owed[0]! : null;
}
