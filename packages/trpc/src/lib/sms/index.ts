import "server-only";

import { telnyxProvider } from "./telnyx/client";
import { SMS_PROVIDER_IDS, type SmsProvider, type SmsProviderId } from "./types";
import { zernioProvider } from "./zernio/client";

// Texting providers. SMS_PROVIDER on the api service picks the one the hub
// buys numbers on and sends with (default zernio). Each provider's webhook
// route stays live either way, so receipts for the other one still land.
// New provider: sms/<id>/client.ts + webhook.ts, a line here, and
// apps/api/app/api/webhook/<id>/route.ts.

const PROVIDERS: Record<SmsProviderId, SmsProvider> = {
  zernio: zernioProvider,
  telnyx: telnyxProvider,
};

export function activeSmsProviderId(): SmsProviderId {
  const id = process.env.SMS_PROVIDER?.trim().toLowerCase();
  return SMS_PROVIDER_IDS.find((p) => p === id) ?? "zernio";
}

export function smsProvider(id: SmsProviderId = activeSmsProviderId()): SmsProvider {
  return PROVIDERS[id];
}

export * from "./types";
