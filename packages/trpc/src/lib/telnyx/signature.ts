import { createPublicKey, verify } from "node:crypto";

// Telnyx signs every webhook with Ed25519 over "<timestamp>|<raw body>".
// The public key (portal: Keys & Credentials > Public Key) is the raw 32-byte
// key in base64; node wants it wrapped as SPKI DER.

const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
/** Older than this (either way) is a replay. */
export const TELNYX_TOLERANCE_SECONDS = 300;

export function verifyTelnyxSignature(input: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  publicKey: string;
  nowSeconds?: number;
}): boolean {
  const { rawBody, signature, timestamp, publicKey } = input;
  if (!signature || !timestamp || !/^\d+$/.test(timestamp)) return false;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > TELNYX_TOLERANCE_SECONDS) return false;
  try {
    const raw = Buffer.from(publicKey, "base64");
    if (raw.length !== 32) return false;
    const key = createPublicKey({
      key: Buffer.concat([SPKI_ED25519_PREFIX, raw]),
      format: "der",
      type: "spki",
    });
    return verify(null, Buffer.from(`${timestamp}|${rawBody}`), key, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}
