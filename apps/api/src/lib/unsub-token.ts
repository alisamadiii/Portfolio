import type { Env } from "../env.js";

// Per-contact unsubscribe tokens: hex HMAC-SHA256(contactId) under
// MARKETING_UNSUB_SECRET. The contactId travels in the clear (`c` param);
// the token (`t` param) proves the link came from us. No expiry — an
// unsubscribe link must keep working for the lifetime of the email.

async function hmacKey(env: Env): Promise<CryptoKey> {
  if (!env.MARKETING_UNSUB_SECRET) {
    throw new Error("MARKETING_UNSUB_SECRET not configured (.dev.vars locally).");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.MARKETING_UNSUB_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

const toHex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function signUnsubToken(
  env: Env,
  contactId: string
): Promise<string> {
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(env),
    new TextEncoder().encode(contactId)
  );
  return toHex(sig);
}

export async function verifyUnsubToken(
  env: Env,
  contactId: string,
  token: string
): Promise<boolean> {
  if (!contactId || !token) return false;
  const expected = await signUnsubToken(env, contactId);
  // Constant-time compare — both sides are fixed-length hex of our own HMAC.
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export function unsubscribeUrl(env: Env, contactId: string, token: string): string {
  const base = (env.MARKETING_PUBLIC_URL ?? "https://api.alisamadii.com").replace(
    /\/+$/,
    ""
  );
  return `${base}/v1/marketing/unsubscribe?c=${contactId}&t=${token}`;
}
