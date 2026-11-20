import { createPublicKey, verify } from "node:crypto";

import { toE164 } from "../../inbox-shared";
import type { SmsEvent, SmsStatus } from "../types";

// Telnyx webhooks, pure (no env, no db) so tests can run them.
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

/**
 * Telnyx per-recipient status -> our message status. Unknown ones keep the
 * row as sent, which is what the carrier last confirmed.
 */
export function telnyxStatus(status: string | undefined): SmsStatus {
  switch (status) {
    case "queued":
    case "sending":
      return "queued";
    case "delivered":
      return "delivered";
    case "sending_failed":
    case "delivery_failed":
      return "failed";
    default:
      return "sent";
  }
}

export type TelnyxEvent = {
  data?: {
    event_type?: string;
    payload?: {
      id?: string;
      from?: { phone_number?: string };
      to?: { phone_number?: string; status?: string }[];
      text?: string;
      media?: { url?: string; content_type?: string }[];
      errors?: { title?: string; detail?: string }[];
    };
  };
};

/** One Telnyx event -> inbox events (none for types we don't use). */
export function telnyxEvents(event: TelnyxEvent): SmsEvent[] {
  const type = event.data?.event_type;
  const payload = event.data?.payload;
  if (!type || !payload?.id) return [];

  if (type === "message.received") {
    const to = toE164(payload.to?.[0]?.phone_number);
    const from = toE164(payload.from?.phone_number);
    if (!to || !from) return [];
    return [
      {
        type: "inbound",
        messageId: payload.id,
        to,
        from,
        text: payload.text ?? "",
        media: (payload.media ?? []).flatMap((m) => (m.url ? [{ url: m.url, contentType: m.content_type }] : [])),
      },
    ];
  }

  if (type === "message.sent" || type === "message.finalized") {
    const status = telnyxStatus(payload.to?.[0]?.status);
    const error = payload.errors?.[0];
    return [
      {
        type: "status",
        messageId: payload.id,
        status,
        error: status === "failed" ? error?.detail || error?.title || "The carrier didn't deliver this text." : null,
      },
    ];
  }
  return [];
}

/** Verifies a delivery and returns its events; null = bad signature or body. */
export function parseTelnyxWebhook(input: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  publicKey: string;
  nowSeconds?: number;
}): SmsEvent[] | null {
  if (!verifyTelnyxSignature(input)) return null;
  try {
    return telnyxEvents(JSON.parse(input.rawBody) as TelnyxEvent);
  } catch {
    return null;
  }
}
