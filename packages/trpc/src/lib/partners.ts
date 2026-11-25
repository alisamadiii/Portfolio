import "server-only";

import { createElement } from "react";
import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { partner, partnerReferral } from "@workspace/drizzle/schema";
import PartnerApplicationTemplate from "@workspace/email/emails/partner-application";
import PartnerApprovedTemplate from "@workspace/email/emails/partner-approved";
import PartnerRejectedTemplate from "@workspace/email/emails/partner-rejected";
import { sendEmail } from "@workspace/email/usesend";
import { renderEmailParts } from "@workspace/email/utils";

import { createRecipientInvite, getRecipient, getRecipientInvite, getTransaction, isMercuryConfigured } from "./mercury";
import { isOutgoingToRecipient, matchPayoutReferral, type MercuryInvite } from "./mercury-shared";
import { normalizePartnerCode } from "./partners-shared";

// ─── Partner program (server) ────────────────────────────────────
// Applications come from apps/api /api/partners/apply, admin manages them in
// routers/partners.ts, and agency forms attach referrals by code.

const FROM = "Ali Samadii LLC <noreply@alisamadii.com>";
export const PARTNER_ADMIN_EMAIL = "a@alisamadii.com";
const REPLY_TO = "a@alisamadii.com";

const dev = process.env.NODE_ENV === "development";
const API_BASE = dev ? "http://localhost:3000" : "https://api.alisamadii.com";
const ADMIN_BASE = dev ? "http://localhost:3001" : "https://admin.alisamadii.com";

export const partnerAdminUrl = (id: string) => `${ADMIN_BASE}/partners/${id}`;

/** Public download link for a partner's signed agreement. */
export const agreementUrl = (pdfToken: string) =>
  `${API_BASE}/api/partners/agreement/${pdfToken}`;

export const agreementKey = (partnerId: string, pdfToken: string) =>
  `partners/agreements/${partnerId}-${pdfToken}.pdf`;

const RECEIPT_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "application/pdf": ".pdf",
};

export const receiptKey = (partnerId: string, referralId: number, type: string) =>
  `partners/receipts/${partnerId}/${referralId}-${crypto.randomUUID()}${RECEIPT_EXT[type] ?? ""}`;

/** Approved partner by code, or null. Case-insensitive, trims input. */
export async function findApprovedPartnerByCode(code: string) {
  const normalized = normalizePartnerCode(code);
  if (!normalized) return null;
  const [row] = await db
    .select({ id: partner.id, fullName: partner.fullName, code: partner.code })
    .from(partner)
    // Case-insensitive: matched lowercased, like the uq_partner_code_lower index.
    .where(
      and(
        sql`lower(${partner.code}) = ${normalized.toLowerCase()}`,
        eq(partner.status, "approved")
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Whether another partner already has this code, compared lowercased so
 * "Ali" and "ALI" count as the same code. `exceptId` = the partner being
 * edited (keeping its own code is fine).
 */
export async function isPartnerCodeTaken(code: string, exceptId?: string) {
  const lowered = normalizePartnerCode(code).toLowerCase();
  const [row] = await db
    .select({ id: partner.id })
    .from(partner)
    .where(
      and(
        sql`lower(${partner.code}) = ${lowered}`,
        exceptId ? ne(partner.id, exceptId) : undefined
      )
    )
    .limit(1);
  return !!row;
}

/**
 * A referral code typed on an agency form. Never throws: the form submit
 * must not fail because of it. Returns who referred, or null.
 */
export async function attachFormReferral(input: {
  code: string;
  businessName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}) {
  try {
    const found = await findApprovedPartnerByCode(input.code);
    if (!found) return null;
    await db.insert(partnerReferral).values({
      partnerId: found.id,
      businessName:
        input.businessName?.trim() || input.contactName?.trim() || "Unknown business",
      contactName: input.contactName?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim().slice(0, 2000) || null,
      source: "form",
    });
    return found;
  } catch (err) {
    console.error("[partners] attach referral failed", err);
    return null;
  }
}

/** Line for Ali's form email: who referred, or the unknown code. */
export const referralLine = (
  code: string | undefined,
  found: { fullName: string; code: string | null } | null
) =>
  !code?.trim()
    ? null
    : found
      ? `Referred by ${found.fullName} (${found.code})`
      : `Referral code (not found): ${code.trim()}`;

// ─── Mercury payouts ─────────────────────────────────────────────
// Partners add their bank account on Mercury's own form (invite on
// approval, W-9 included). Ali pays by ACH in Mercury; the webhook below
// matches each transfer to the owed referral. Nothing here moves money.

type PartnerRow = typeof partner.$inferSelect;

const INVITE_RECHECK_MS = 10 * 60 * 1000;

const inviteFields = (invite: MercuryInvite) => ({
  mercuryInviteId: invite.id,
  mercuryInviteUrl: invite.onboardingUrl,
  mercuryInviteStatus: invite.status,
  mercuryInviteCheckedAt: new Date(),
});

/** Sends (or re-sends) the Mercury invite email and stores the invite. Throws on API errors. */
export async function inviteToMercury(p: PartnerRow) {
  const invite = await createRecipientInvite({
    name: p.fullName,
    contactEmail: p.email,
    recipientId: p.mercuryRecipientId,
    notes: "Partner Program payouts from Ali Samadii LLC. Add the bank account you want your referral payouts sent to. You can skip creating a Mercury profile.",
  });
  await db
    .update(partner)
    .set({ ...inviteFields(invite), mercuryInviteAt: new Date() })
    .where(eq(partner.id, p.id));
  return invite;
}

/**
 * Refreshes a pending invite from Mercury at most every 10 minutes (or on
 * `force`), and copies the recipient id + bank name once it completes.
 * Never throws: page loads must not break when Mercury is down.
 */
export async function syncMercuryInvite(p: PartnerRow, force = false): Promise<PartnerRow> {
  if (!isMercuryConfigured() || !p.mercuryInviteId || p.mercuryRecipientId) return p;
  const stale =
    force || !p.mercuryInviteCheckedAt || Date.now() - p.mercuryInviteCheckedAt.getTime() > INVITE_RECHECK_MS;
  if (!stale || (p.mercuryInviteStatus !== "created" && !force)) return p;
  try {
    const invite = await getRecipientInvite(p.mercuryInviteId);
    const patch: Partial<PartnerRow> = inviteFields(invite);
    if (invite.status === "completed" && invite.recipientId) {
      patch.mercuryRecipientId = invite.recipientId;
      const recipient = await getRecipient(invite.recipientId).catch(() => null);
      patch.mercuryBankName = recipient?.electronicRoutingInfo?.bankName?.trim() || null;
    }
    await db.update(partner).set(patch).where(eq(partner.id, p.id));
    return { ...p, ...patch };
  } catch (err) {
    console.error("[partners] mercury invite sync failed", p.id, err);
    return p;
  }
}

/**
 * Webhook: a Mercury transaction was created or updated. Re-reads it, finds
 * the partner by recipient and the one owed referral with that commission,
 * then records the transfer (paid once Mercury says "sent"). Safe to run
 * twice; ambiguous matches are left for admin.
 */
export async function handleMercuryTransactionEvent(transactionId: string) {
  const t = await getTransaction(transactionId);
  if (!isOutgoingToRecipient(t)) return { matched: false as const, reason: "not a payout" };
  const [p] = await db
    .select({ id: partner.id })
    .from(partner)
    .where(eq(partner.mercuryRecipientId, t.counterpartyId!))
    .limit(1);
  if (!p) return { matched: false as const, reason: "no partner for recipient" };
  const rows = await db
    .select({
      id: partnerReferral.id,
      commissionCents: partnerReferral.commissionCents,
      partnerPaidAt: partnerReferral.partnerPaidAt,
      mercuryTransactionId: partnerReferral.mercuryTransactionId,
      clientPaidAt: partnerReferral.clientPaidAt,
    })
    .from(partnerReferral)
    .where(eq(partnerReferral.partnerId, p.id));
  const match = matchPayoutReferral(t, rows.filter((r) => r.clientPaidAt));
  if (!match) {
    console.warn("[partners] mercury payout not matched", { transactionId, partnerId: p.id, amount: t.amount });
    return { matched: false as const, reason: "no single owed referral" };
  }
  const sent = t.status === "sent";
  await db
    .update(partnerReferral)
    .set({
      mercuryTransactionId: t.id,
      mercuryTransactionStatus: t.status,
      mercuryTransactionUrl: t.dashboardLink,
      ...(sent && !match.partnerPaidAt
        ? {
            partnerPaidAt: new Date(t.postedAt ?? t.createdAt),
            payoutReference: `Mercury ${t.id}`,
          }
        : {}),
    })
    .where(eq(partnerReferral.id, match.id));
  return { matched: true as const, referralId: match.id, status: t.status };
}

// ─── Emails ──────────────────────────────────────────────────────

// Templates live in packages/email (partner-application, partner-approved,
// partner-rejected) so they show up in the React Email preview.

export type PartnerApplicationEmail = {
  fullName: string;
  email: string;
  phone: string | null;
  occupation: string | null;
  city: string | null;
  knowOwners: string | null;
  whyJoin: string | null;
};

export async function sendPartnerApplicationAlert(
  a: PartnerApplicationEmail,
  adminUrl: string
) {
  return sendEmail({
    from: FROM,
    to: PARTNER_ADMIN_EMAIL,
    replyTo: a.email,
    subject: `New partner application: ${a.fullName}`,
    ...(await renderEmailParts(
      createElement(PartnerApplicationTemplate, { ...a, adminUrl })
    )),
  });
}

export async function sendPartnerApproved(a: {
  fullName: string;
  email: string;
  code: string;
  mercuryUrl?: string | null;
}) {
  return sendEmail({
    from: FROM,
    to: a.email,
    replyTo: REPLY_TO,
    subject: "You're approved: your partner referral code",
    ...(await renderEmailParts(
      createElement(PartnerApprovedTemplate, {
        fullName: a.fullName,
        code: a.code,
        mercuryUrl: a.mercuryUrl ?? null,
      })
    )),
  });
}

/** The invite link to put in emails: only while the partner still has to add their bank. */
export const pendingMercuryUrl = (p: {
  mercuryInviteUrl: string | null;
  mercuryInviteStatus: string | null;
  mercuryRecipientId: string | null;
}) => (p.mercuryRecipientId || p.mercuryInviteStatus !== "created" ? null : p.mercuryInviteUrl);

export async function sendPartnerRejected(a: { fullName: string; email: string }) {
  return sendEmail({
    from: FROM,
    to: a.email,
    replyTo: REPLY_TO,
    subject: "Your Partner Program application",
    ...(await renderEmailParts(
      createElement(PartnerRejectedTemplate, { fullName: a.fullName })
    )),
  });
}
