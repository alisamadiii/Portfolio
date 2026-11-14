import "server-only";

import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { partner, partnerReferral } from "@workspace/drizzle/schema";
import { sendEmail } from "@workspace/email/usesend";

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

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

const layout = (title: string, body: string) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f6f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;border:1px solid #e7e3de;">
            <tr>
              <td style="padding:28px 32px 8px;font:600 20px/1.3 ${FONT};color:#221f1c;">${title}</td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font:400 15px/1.6 ${FONT};color:#221f1c;">${body}</td>
            </tr>
          </table>
          <div style="margin-top:16px;font:400 12px/1.5 ${FONT};color:#6b6560;">
            Ali Samadii LLC &middot; 566 Kit St, Jacksonville, FL &middot; (971) 382-8969
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const p = (text: string) => `<p style="margin:12px 0 0;">${text}</p>`;

export type PartnerApplicationEmail = {
  fullName: string;
  email: string;
  phone: string | null;
  occupation: string | null;
  city: string | null;
  knowOwners: string | null;
  whyJoin: string | null;
};

export function sendPartnerApplicationAlert(
  a: PartnerApplicationEmail,
  adminUrl: string
) {
  const rows: [string, string][] = [
    ["Name", a.fullName],
    ["Email", a.email],
    ["Phone", a.phone ?? "Not provided"],
    ["Occupation", a.occupation ?? "Not provided"],
    ["City", a.city ?? "Not provided"],
    ["Knows owners through", a.knowOwners ?? "Not provided"],
    ["Why join", a.whyJoin ?? "Not provided"],
  ];
  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;color:#6b6560;vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:8px 0;white-space:pre-wrap;">${escapeHtml(v)}</td></tr>`
    )
    .join("");
  return sendEmail({
    from: FROM,
    to: PARTNER_ADMIN_EMAIL,
    replyTo: a.email,
    subject: `New partner application: ${a.fullName}`,
    html: layout(
      `${escapeHtml(a.fullName)} applied to the Partner Program`,
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;font:400 14px/1.5 ${FONT};">${table}</table>` +
        p(
          `<a href="${escapeHtml(adminUrl)}" style="color:#c2502f;">Review in admin</a>`
        )
    ),
    text: [
      "New partner application",
      "",
      ...rows.map(([k, v]) => `${k}: ${v}`),
      "",
      `Review: ${adminUrl}`,
    ].join("\n"),
  });
}

export function sendPartnerApproved(a: {
  fullName: string;
  email: string;
  code: string;
  pdfUrl: string;
}) {
  const first = a.fullName.trim().split(/\s+/)[0] ?? a.fullName;
  const site = `https://www.alisamadii.com/?ref=${encodeURIComponent(a.code)}`;
  return sendEmail({
    from: FROM,
    to: a.email,
    replyTo: REPLY_TO,
    subject: "You're approved: your partner referral code",
    html: layout(
      `Welcome to the Partner Program, ${escapeHtml(first)}`,
      p("Your application is approved. Here is your referral code:") +
        `<div style="margin:16px 0;padding:14px 18px;border:1px solid #e7e3de;border-left:3px solid #fc8464;border-radius:6px;font:700 22px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.06em;">${escapeHtml(a.code)}</div>` +
        p(
          "Give it to any business that needs a website. They can enter it on our quote form, mention it when we talk, or use your link:"
        ) +
        p(`<a href="${site}" style="color:#c2502f;">${escapeHtml(site)}</a>`) +
        p(
          "When a business you referred pays for its website, you earn 40% of that first payment. We'll email you when that happens and when your payout is sent."
        ) +
        p(
          `Your signed agreement: <a href="${escapeHtml(a.pdfUrl)}" style="color:#c2502f;">download PDF</a>.`
        ) +
        p("Questions? Just reply to this email.") +
        p("Ali Samadi")
    ),
    text: [
      `Welcome to the Partner Program, ${first}.`,
      "",
      `Your referral code: ${a.code}`,
      "",
      "Give it to any business that needs a website. They can enter it on our quote form, mention it when we talk, or use your link:",
      site,
      "",
      "When a business you referred pays for its website, you earn 40% of that first payment.",
      "",
      `Your signed agreement: ${a.pdfUrl}`,
      "",
      "Ali Samadi",
    ].join("\n"),
  });
}

export function sendPartnerRejected(a: { fullName: string; email: string }) {
  const first = a.fullName.trim().split(/\s+/)[0] ?? a.fullName;
  return sendEmail({
    from: FROM,
    to: a.email,
    replyTo: REPLY_TO,
    subject: "Your Partner Program application",
    html: layout(
      `Thanks for applying, ${escapeHtml(first)}`,
      p(
        "We read your application carefully, and we can't approve it right now. This isn't a judgment of you: we keep the program small so we can give every partner and client real attention."
      ) +
        p("If anything changes on our side, we'll reach out. Thanks again for your interest.") +
        p("Ali Samadi")
    ),
    text: [
      `Thanks for applying, ${first}.`,
      "",
      "We read your application carefully, and we can't approve it right now. We keep the program small so we can give every partner and client real attention.",
      "",
      "If anything changes on our side, we'll reach out.",
      "",
      "Ali Samadi",
    ].join("\n"),
  });
}
