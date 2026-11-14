// Pure partner-program helpers (no DB, no server-only) so tests and both
// apps can import them.

export const PARTNER_PAYOUT_RATE = 0.4;

/** 40% of the client's first payment, in cents. 69_900 -> 27_960. */
export const commissionFor = (clientPaidCents: number) =>
  Math.round(clientPaidCents * PARTNER_PAYOUT_RATE);

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

/** Same name the hub Sites table shows: the site's host, else the repo. */
export const projectDisplayName = (p: { websiteUrl: string | null; repo: string }) =>
  p.websiteUrl?.trim()
    ? p.websiteUrl.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || p.repo
    : p.repo;

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
