import "server-only";

import { TRPCError } from "@trpc/server";

import {
  SmsProviderError,
  type AvailableNumber,
  type OwnedNumber,
  type SmsProvider,
} from "../types";
import { parseZernioWebhook } from "./webhook";

// Zernio REST v1 on the agency's one account (ZERNIO_API_KEY on the api
// service). Numbers sit on the account's default profile; replies route by
// the number itself, so sms_profile_id stays null. sms_number_id = Zernio's
// phone number id. One account-wide webhook (ZERNIO_WEBHOOK_SECRET) brings
// replies and delivery receipts to /api/webhook/zernio.
// US texting needs the 10DLC registration approved in the Zernio dashboard.

const BASE = "https://zernio.com/api/v1";
const dev = process.env.NODE_ENV !== "production";

/** Where Zernio posts message events. Override for a local tunnel. */
const zernioWebhookUrl = () =>
  process.env.ZERNIO_WEBHOOK_URL ||
  `${dev ? "http://localhost:3000" : "https://api.alisamadii.com"}/api/webhook/zernio`;

const WEBHOOK_EVENTS = ["message.received", "message.delivered", "message.failed"];

/** Zernio error codes -> what the hub shows. */
const FRIENDLY: Record<string, string> = {
  registration_required: "Texting isn't registered yet. Finish the US 10DLC registration in Zernio.",
  registration_pending: "The texting registration is still waiting for carrier approval.",
  recipient_opted_out: "This lead replied STOP, so they can't be texted.",
  cross_border_not_supported: "This number can only text numbers in its own country.",
  mms_not_supported: "This number can't send pictures.",
  PHONE_NUMBER_UNAVAILABLE: "That number was just taken. Search again and pick another.",
  PAYMENT_REQUIRED: "Add a payment method in Zernio before buying numbers.",
};

async function zernio<T>(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
  const key = process.env.ZERNIO_API_KEY;
  if (!key) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Texting isn't configured (ZERNIO_API_KEY)." });
  }
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string; message?: string };
  if (!res.ok) {
    const code = json.code;
    throw new SmsProviderError(
      (code && FRIENDLY[code]) || json.error || json.message || `Zernio request failed (${res.status})`,
      res.status,
      code
    );
  }
  return json;
}

/** The account's default profile: every hub number lives there. */
async function defaultProfileId() {
  const { profiles } = await zernio<{ profiles: { _id: string; isDefault?: boolean }[] }>("/profiles");
  const profile = profiles.find((p) => p.isDefault) ?? profiles[0];
  if (!profile) throw new SmsProviderError("The Zernio account has no profile yet.", 409);
  return profile._id;
}

/** Turns texting on for a number. A fresh number can take a moment to be ready. */
async function enableSms(numberId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await zernio<{ enabled?: boolean; notReady?: boolean }>(
        `/phone-numbers/${encodeURIComponent(numberId)}/sms`,
        { method: "POST" }
      );
      if (!res.notReady) return;
    } catch (error) {
      // Already enabled.
      if (error instanceof SmsProviderError && error.status === 409) return;
      throw error;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new SmsProviderError("The number is still being set up. Try again in a minute.", 409);
}

type Webhook = { _id: string; url: string; events?: string[]; isActive?: boolean };

/** One account webhook for the hub; created or repaired when a number is added. */
async function ensureWebhook() {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET;
  if (!secret) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Texting isn't configured (ZERNIO_WEBHOOK_SECRET)." });
  }
  const url = zernioWebhookUrl();
  const { webhooks } = await zernio<{ webhooks: Webhook[] }>("/webhooks/settings");
  const existing = webhooks.find((w) => w.url === url);
  const settings = { name: "Client Hub texting", url, secret, events: WEBHOOK_EVENTS };
  if (!existing) {
    await zernio("/webhooks/settings", { method: "POST", body: settings });
    return;
  }
  // Re-sent every time: keeps our events on, re-enables a disabled endpoint,
  // and picks up a rotated secret.
  await zernio("/webhooks/settings", {
    method: "PUT",
    body: {
      ...settings,
      webhookId: existing._id,
      events: Array.from(new Set([...(existing.events ?? []), ...WEBHOOK_EVENTS])),
      isActive: true,
    },
  });
}

async function searchNumbers(areaCode?: string): Promise<AvailableNumber[]> {
  const params = new URLSearchParams({ country: "US", numberType: "local", sms: "true", limit: "20" });
  if (areaCode) params.set("areaCode", areaCode);
  const { numbers } = await zernio<{
    numbers: {
      phoneNumber?: string;
      locality?: string;
      regionInfo?: { region_name: string; region_type: string }[];
    }[];
  }>(`/phone-numbers/available?${params}`);
  // No price: the search's cost is the carrier's wholesale rate, not what
  // Zernio bills (GET /phone-numbers/countries has that).
  return numbers.flatMap((n) =>
    n.phoneNumber
      ? [
          {
            phoneNumber: n.phoneNumber,
            locality: n.locality ?? null,
            region: n.regionInfo?.find((r) => r.region_type === "state")?.region_name ?? null,
            monthlyCost: null,
            upfrontCost: null,
          },
        ]
      : []
  );
}

async function listOwnedNumbers(): Promise<OwnedNumber[]> {
  const { numbers } = await zernio<{
    numbers: {
      _id: string;
      phoneNumber: string;
      smsCapable?: boolean;
      profileId?: string | { _id: string; name?: string | null } | null;
    }[];
  }>("/phone-numbers?status=active");
  return numbers
    .filter((n) => n.smsCapable !== false)
    .map((n) => ({
      id: n._id,
      phoneNumber: n.phoneNumber,
      profileId: typeof n.profileId === "object" ? (n.profileId?._id ?? null) : (n.profileId ?? null),
      profileName: typeof n.profileId === "object" ? (n.profileId?.name ?? null) : null,
    }));
}

export const zernioProvider: SmsProvider = {
  id: "zernio",
  name: "Zernio",
  envHint: "ZERNIO_API_KEY and ZERNIO_WEBHOOK_SECRET",
  isConfigured: () => Boolean(process.env.ZERNIO_API_KEY && process.env.ZERNIO_WEBHOOK_SECRET),
  searchNumbers,
  listOwnedNumbers,

  async buyNumber({ phoneNumber, projectId }) {
    await ensureWebhook();
    const res = await zernio<{
      checkoutUrl?: string;
      status?: string;
      numberId?: string;
      phoneNumber?: string | { id: string; phoneNumber: string };
    }>("/phone-numbers/purchase", {
      method: "POST",
      body: {
        profileId: await defaultProfileId(),
        country: "US",
        numberType: "local",
        phoneNumber,
        connectWhatsapp: false,
        wantsSms: true,
        // Same project + number = same purchase, so a retry never buys twice.
        purchaseIntentId: `hub-${projectId}-${phoneNumber}`,
        allowMultiple: true,
      },
    });
    const bought =
      typeof res.phoneNumber === "object"
        ? res.phoneNumber
        : res.numberId
          ? { id: res.numberId, phoneNumber: res.phoneNumber ?? phoneNumber }
          : null;
    if (!bought) {
      throw new SmsProviderError(
        res.checkoutUrl
          ? "Zernio needs its billing set up first (open the Zernio dashboard and buy the first number there)."
          : "Zernio didn't return the number. Check the Zernio dashboard.",
        402
      );
    }
    await enableSms(bought.id);
    return { phoneNumber: bought.phoneNumber, numberId: bought.id, profileId: null };
  },

  async linkNumber({ number }) {
    await ensureWebhook();
    await enableSms(number.id);
    return { phoneNumber: number.phoneNumber, numberId: number.id, profileId: null };
  },

  async releaseNumber({ phoneNumber, numberId }) {
    const id = numberId ?? (await listOwnedNumbers()).find((n) => n.phoneNumber === phoneNumber)?.id;
    if (!id) return;
    await zernio(`/phone-numbers/${encodeURIComponent(id)}`, { method: "DELETE" }).catch((error) => {
      if (!(error instanceof SmsProviderError && error.status === 404)) throw error;
    });
  },

  async send({ from, to, text, mediaUrls, idempotencyKey }) {
    const res = await zernio<{ id: string; status?: string }>("/sms/messages", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: { from, to, ...(text && { text }), ...(mediaUrls?.length && { mediaUrls }) },
    });
    // "sent" = the carrier took it; delivered/failed come by webhook.
    return { id: res.id, status: "sent" };
  },

  // Inbound media can sit behind Zernio's API; their links need the key.
  fetchMedia: (url) =>
    fetch(url, {
      headers:
        new URL(url).hostname.endsWith("zernio.com") && process.env.ZERNIO_API_KEY
          ? { Authorization: `Bearer ${process.env.ZERNIO_API_KEY}` }
          : undefined,
      signal: AbortSignal.timeout(15_000),
    }),

  parseWebhook(rawBody, headers) {
    const secret = process.env.ZERNIO_WEBHOOK_SECRET;
    if (!secret) return { ok: false, status: 503, reason: "ZERNIO_WEBHOOK_SECRET is not set" };
    const events = parseZernioWebhook({
      rawBody,
      signature: headers.get("x-zernio-signature") ?? headers.get("x-late-signature"),
      secret,
    });
    return events ? { ok: true, events } : { ok: false, status: 401, reason: "Invalid signature" };
  },
};
