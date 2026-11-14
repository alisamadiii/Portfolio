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
  pdfUrl: string;
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
        pdfUrl: a.pdfUrl,
      })
    )),
  });
}

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
