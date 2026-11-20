import { createHmac, timingSafeEqual } from "node:crypto";

import { toE164 } from "../../inbox-shared";
import type { SmsEvent } from "../types";

// Zernio webhooks, pure (no env, no db) so tests can run them.
// X-Zernio-Signature = lowercase hex HMAC-SHA256 of the raw body with the
// secret we gave the webhook (ZERNIO_WEBHOOK_SECRET). No timestamp is signed;
// replays are harmless because the handler dedupes on the message id.

export function verifyZernioSignature(input: {
  rawBody: string;
  signature: string | null;
  secret: string;
}): boolean {
  const { rawBody, signature, secret } = input;
  if (!signature || !secret || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export type ZernioEvent = {
  id?: string;
  event?: string;
  test?: boolean;
  message?: {
    id?: string;
    platform?: string;
    direction?: string;
    text?: string | null;
    attachments?: { type?: string; url?: string }[];
    sender?: { id?: string };
  };
  account?: { platform?: string; username?: string };
  error?: { code?: string | number; title?: string; message?: string } | null;
};

/** One Zernio event -> inbox events (SMS only; DMs from other platforms are ignored). */
export function zernioEvents(event: ZernioEvent): SmsEvent[] {
  const message = event.message;
  if (event.test || !message?.id || message.platform !== "sms") return [];

  if (event.event === "message.received") {
    if (message.direction && message.direction !== "incoming") return [];
    const to = toE164(event.account?.username);
    const from = toE164(message.sender?.id);
    if (!to || !from) return [];
    return [
      {
        type: "inbound",
        messageId: message.id,
        to,
        from,
        text: message.text ?? "",
        media: (message.attachments ?? []).flatMap((a) => (a.url ? [{ url: a.url }] : [])),
      },
    ];
  }

  // SMS never fires message.sent: the send response is "sent", carrier
  // receipts come as delivered/failed.
  if (event.event === "message.delivered") {
    return [{ type: "status", messageId: message.id, status: "delivered", error: null }];
  }
  if (event.event === "message.failed") {
    return [
      {
        type: "status",
        messageId: message.id,
        status: "failed",
        error: event.error?.message || event.error?.title || "The carrier didn't deliver this text.",
      },
    ];
  }
  return [];
}

/** Verifies a delivery and returns its events; null = bad signature or body. */
export function parseZernioWebhook(input: {
  rawBody: string;
  signature: string | null;
  secret: string;
}): SmsEvent[] | null {
  if (!verifyZernioSignature(input)) return null;
  try {
    return zernioEvents(JSON.parse(input.rawBody) as ZernioEvent);
  } catch {
    return null;
  }
}
