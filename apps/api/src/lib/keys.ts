// API-key generation, hashing, and at-rest encryption. Runs on WebCrypto
// (available in the Worker and in Node >= 18 via globalThis.crypto).

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// sha-256 hex of the full key — only this is persisted for auth lookups.
export async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

// Keys come in two flavours, distinguished by their prefix:
//   ak_pub_  public/browser key — only works from the user's allowedOrigins
//   ak_ser_  server key         — no origin check, works from anywhere
export type ApiKeyType = "public" | "server";

const PREFIXES: Record<ApiKeyType, string> = {
  public: "ak_pub_",
  server: "ak_ser_",
};

// Keys issued before the pub/ser split. Still accepted, and treated as public.
export const LEGACY_PUBLIC_PREFIX = "ak_live_";

// Classify a stored `prefix` (or a full key). Only an explicit ak_ser_ match
// counts as a server key, so anything unrecognised falls into the
// origin-checked path rather than out of it.
export function keyTypeFromPrefix(prefix: string | null): ApiKeyType {
  return prefix?.startsWith(PREFIXES.server) ? "server" : "public";
}

// Generate a fresh key: prefix + 32 hex chars (16 random bytes).
export async function generateApiKey(type: ApiKeyType = "public"): Promise<{
  key: string;
  prefix: string;
  keyHash: string;
}> {
  const base = PREFIXES[type];
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const secret = [...bytes]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const key = `${base}${secret}`;
  const prefix = key.slice(0, base.length + 6); // base + first 6 hex
  const keyHash = await hashKey(key);
  return { key, prefix, keyHash };
}

// ── AES-256-GCM for key values at rest ──────────────────────────────────────
// The 32-byte AES key is derived from KEY_ENC_SECRET (any string) via sha-256.
// Payload format: base64( iv(12) || ciphertext+tag ).

async function importKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptSecret(
  plain: string,
  secret: string
): Promise<string> {
  if (!secret) throw new Error("KEY_ENC_SECRET is not set");
  const key = await importKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plain)
    )
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return toB64(out);
}

// ── Password hashing (PBKDF2) ───────────────────────────────────────────────
// Deliberately NOT hashKey/sha-256. A bare sha-256 runs ~10 billion times a
// second on a GPU, so if the stored hash ever leaks (it lives in the repo), a
// human-memorable password falls in minutes. PBKDF2 at 600k iterations makes
// each guess cost ~100ms instead — the same crack goes from minutes to
// millennia. 600k matches OWASP's 2023 floor for PBKDF2-HMAC-SHA256.
//
// The salt doesn't need to be secret; it exists so the hash can't be looked up
// in a precomputed rainbow table.
export const PBKDF2_ITERATIONS = 600_000;

export async function hashPassword(
  password: string,
  saltHex: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const salt = new Uint8Array(
    (saltHex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16))
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256
  );
  return toHex(bits);
}

export async function decryptSecret(
  payload: string,
  secret: string
): Promise<string> {
  if (!secret) throw new Error("KEY_ENC_SECRET is not set");
  const key = await importKey(secret);
  const data = fromB64(payload);
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}
