import { createHmac, timingSafeEqual } from "node:crypto";

import { UseSendError, usesendFetch } from "@workspace/email/usesend";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";

// ─── Newsletter constants ───────────────────────────────────────
// Double-opt-in newsletter for the agency site. Contacts land in the
// useSend contact book below; sends go out from the dedicated
// newsletter address so quote/transactional reputation stays separate.

export const FROM = "Ali Samadi Agency <newsletter@alisamadii.com>";
export const AGENCY_SITE = "https://agency.alisamadii.com";
export const API_SITE = "https://www.alisamadii.com";

const contactBook = () => {
  const id = process.env.USESEND_CONTACT_BOOK_ID;
  if (!id) throw new Error("Missing USESEND_CONTACT_BOOK_ID in environment");
  return id;
};

// Upsert-by-email into the newsletter contact book. Create first (covers the
// common case); an existing contact answers with a conflict, at which point
// the contactId is resolved by email and patched.
export async function setSubscription(email: string, subscribed: boolean) {
  const book = contactBook();
  const base = `/api/v1/contactBooks/${encodeURIComponent(book)}/contacts`;

  try {
    await usesendFetch(base, { method: "POST", body: { email, subscribed } });
    return;
  } catch (error) {
    // Anything but a duplicate-contact conflict is a real failure.
    if (!(error instanceof UseSendError) || error.status >= 500) throw error;
  }

  const contacts = await usesendFetch<
    { id: string; email: string }[] | { contacts: { id: string; email: string }[] }
  >(base, { query: { emails: email } });
  const list = Array.isArray(contacts) ? contacts : contacts.contacts;
  const contact = list?.find(
    (c) => c.email.toLowerCase() === email.toLowerCase()
  );
  if (!contact) {
    throw new Error(`useSend contact not found for ${email}`);
  }

  await usesendFetch(`${base}/${encodeURIComponent(contact.id)}`, {
    method: "PATCH",
    body: { subscribed },
  });
}

// ─── Signed tokens (no DB) ──────────────────────────────────────
// token = base64url(email) + "." + expiryMs + "." + base64url(hmac)
// hmac = SHA-256(email + "." + expiryMs, INTERNAL_API_SECRET)
// expiryMs = 0 → never expires (unsubscribe links).

const secret = () => {
  const s = process.env.INTERNAL_API_SECRET;
  if (!s) throw new Error("Missing INTERNAL_API_SECRET in environment");
  return s;
};

const hmac = (payload: string) =>
  createHmac("sha256", secret()).update(payload).digest("base64url");

export const signToken = (email: string, ttlMs: number) => {
  const exp = ttlMs > 0 ? Date.now() + ttlMs : 0;
  const sig = hmac(`${email}.${exp}`);
  return `${Buffer.from(email).toString("base64url")}.${exp}.${sig}`;
};

export const verifyToken = (token: string): string | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [emailB64, expStr, sig] = parts as [string, string, string];

  let email: string;
  try {
    email = Buffer.from(emailB64, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return null;
  if (exp !== 0 && Date.now() > exp) return null;

  const expected = hmac(`${email}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return email;
};

// ─── CORS ───────────────────────────────────────────────────────
// Shared allowlist + ANY localhost/127.0.0.1 origin (any port), so local
// dev works no matter which port the agency site runs on (4321, 5500, …).

const LOCALHOST_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const isAllowedOrigin = (origin: string) =>
  ALLOWED_ORIGINS.includes(origin) || LOCALHOST_RE.test(origin);

export const corsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin":
      origin && isAllowedOrigin(origin) ? origin : "https://agency.alisamadii.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};
