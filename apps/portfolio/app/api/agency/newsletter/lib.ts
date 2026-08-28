import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";

import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";

// ─── Newsletter constants ───────────────────────────────────────
// Double-opt-in newsletter for the agency site. Contacts land in the
// Resend email-marketing segment below; sends go out from the dedicated
// newsletter address so quote/transactional reputation stays separate.

export const SEGMENT_ID = "014eed69-39af-4313-8958-6982bfe52236";
export const FROM = "Ali Samadi Agency <newsletter@alisamadii.com>";
export const AGENCY_SITE = "https://agency.alisamadii.com";
export const API_SITE = "https://www.alisamadii.com";

let client: Resend | null = null;

export const getResend = () => {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY in environment variables");
    }
    client = new Resend(apiKey);
  }
  return client;
};

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
