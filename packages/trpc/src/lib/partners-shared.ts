// Pure partner-program helpers (no DB, no server-only) so tests and both
// apps can import them.

/** Standard partner rate in basis points (20%). Equals partner.commission_bps default. */
export const DEFAULT_COMMISSION_BPS = 2000;

/**
 * The partner's rate (default 20%) of the client's first payment after the
 * payment provider's fee, in cents (agreement 2026-11.3, section 3.1).
 * 69_900 with a 2_057 fee -> 13_569.
 */
export const commissionFor = (clientPaidCents: number, feeCents = 0, bps = DEFAULT_COMMISSION_BPS) =>
  Math.max(0, Math.round(((clientPaidCents - feeCents) * bps) / 10_000));

/** 2000 -> "20%", 2250 -> "22.5%". */
export const formatRate = (bps: number) => `${bps / 100}%`;

/** Default provider fee per payment method: Stripe's US card fee, 2.9% + 30¢. */
export const PROVIDER_FEES = {
  stripe: { percent: 2.9, fixedCents: 30 },
  cashapp: { percent: 0, fixedCents: 0 },
  zelle: { percent: 0, fixedCents: 0 },
  cash: { percent: 0, fixedCents: 0 },
  other: { percent: 0, fixedCents: 0 },
} as const;

/** The provider fee on a payment, in cents. 69_900 at 2.9% + 30¢ -> 2_057. */
export const providerFeeCents = (amountCents: number, percent: number, fixedCents: number) =>
  amountCents > 0 ? Math.round((amountCents * percent) / 100 + fixedCents) : 0;

// No 0/O/1/I/L: codes get read out over the phone and typed by hand.
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * "John Smith" -> "JOHN-4K7Q". Name part: first name, A-Z only, max 8.
 * Not used for approval (Ali types each code by hand); kept as a helper.
 */
export function generatePartnerCode(
  fullName: string,
  random: () => number = Math.random
) {
  const first = (fullName.trim().split(/\s+/)[0] ?? "")
    .normalize("NFD")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 8);
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return `${first || "PARTNER"}-${suffix}`;
}

/** Codes are matched trimmed and uppercased. */
export const normalizePartnerCode = (code: string) =>
  code.trim().toUpperCase().replace(/\s+/g, "");

/**
 * Ali picks each code by hand on approval. After normalizing: 3 to 30
 * letters, digits or single hyphens, starting and ending with a letter or
 * digit. Returns the problem, or null when the code is usable.
 */
export function partnerCodeError(raw: string) {
  const code = normalizePartnerCode(raw);
  if (code.length < 3) return "Use at least 3 characters.";
  if (code.length > 30) return "Use 30 characters or fewer.";
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(code)) {
    return "Use letters, numbers and single hyphens only, like ALI or SUMMER-25.";
  }
  return null;
}

export type ReferralMoney = {
  status: string;
  clientPaidAt: Date | string | null;
  commissionCents: number | null;
  partnerPaidAt: Date | string | null;
};

/** Per-partner (or global) totals. Owed = paying clients not yet paid out. */
export function partnerStats(rows: ReferralMoney[]) {
  let paying = 0;
  let paidOut = 0;
  let owedCents = 0;
  let paidCents = 0;
  for (const r of rows) {
    if (!r.clientPaidAt) continue;
    paying++;
    const c = r.commissionCents ?? 0;
    if (r.partnerPaidAt) {
      paidOut++;
      paidCents += c;
    } else {
      owedCents += c;
    }
  }
  return { referrals: rows.length, paying, paidOut, owedCents, paidCents };
}

export const formatCents = (cents: number) =>
  "$" +
  (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  });

/** Same name the hub Sites table shows: the Settings name, else the site's host, else the repo. */
export const projectDisplayName = (p: { name?: string | null; websiteUrl: string | null; repo: string }) =>
  p.name?.trim() ||
  (p.websiteUrl?.trim()
    ? p.websiteUrl.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || p.repo
    : p.repo);

// ─── Partner payouts via Mercury ─────────────────────────────────
// On approval the api invites the partner through Mercury (our bank) to add
// their bank account on Mercury's own form. Ali pays by ACH from Mercury;
// the Mercury webhook matches the transfer to the owed referral.

export type PartnerPayoutState = "not_invited" | "invited" | "ready" | "expired";

/** Derived from the Mercury invite columns; never from the old payout_method text. */
export function partnerPayoutState(p: {
  mercuryInviteId: string | null;
  mercuryInviteStatus: string | null;
  mercuryRecipientId: string | null;
}): PartnerPayoutState {
  if (p.mercuryRecipientId) return "ready";
  if (!p.mercuryInviteId) return "not_invited";
  if (p.mercuryInviteStatus === "expired" || p.mercuryInviteStatus === "declined") return "expired";
  return "invited";
}

export const PAYOUT_STATE_LABELS: Record<PartnerPayoutState, string> = {
  not_invited: "No Mercury invite yet",
  invited: "Mercury invite sent",
  ready: "Bank account on file",
  expired: "Mercury invite expired",
};

/** Mercury transaction statuses that mean the money did not arrive. */
export const MERCURY_FAILED_STATUSES = ["cancelled", "failed", "reversed", "blocked"] as const;
export const isMercuryFailed = (status: string | null | undefined) =>
  !!status && (MERCURY_FAILED_STATUSES as readonly string[]).includes(status);

/** Mercury amounts are dollars with cents ("194.14"); commissions are stored in cents. */
export const mercuryAmountToCents = (amount: number) => Math.round(Math.abs(amount) * 100);

export const CLIENT_PAYMENT_LABELS = {
  stripe: "Stripe",
  cashapp: "Cash App",
  zelle: "Zelle",
  cash: "Cash",
  other: "Other",
} as const;

/** Quick picks for the website price (cents). */
export const WEBSITE_PRICE_PRESETS = [69_900, 119_900] as const;

// Payout receipts (proof Ali paid the partner): screenshot or PDF, private R2.
export const RECEIPT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;
export type ReceiptType = (typeof RECEIPT_TYPES)[number];
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

// ?ref=CODE visitors: the api verifies the code and sets this cookie on
// .alisamadii.com for 30 days; sign-up / sign-in copies it into
// user.metadata.referral (data only, referrals are still added by hand).
export const PARTNER_REF_COOKIE = "partner_ref";
export const PARTNER_REF_MAX_AGE = 30 * 24 * 60 * 60;

/** The normalized code from a Cookie header, or null when missing/invalid. */
export function parseRefCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0 || part.slice(0, eq).trim() !== PARTNER_REF_COOKIE) continue;
    let value: string;
    try {
      value = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
    const code = normalizePartnerCode(value);
    return code && !partnerCodeError(code) ? code : null;
  }
  return null;
}

/**
 * The agreement version the api accepts on /api/partners/apply. Must equal
 * apps/partner-program/src/config.ts agreementVersion (bump both together,
 * with the text in AgreementText.tsx and packages/ui/src/pdfs/partner-agreement.tsx).
 */
export const PARTNER_AGREEMENT_VERSION = "2026-11.5";
