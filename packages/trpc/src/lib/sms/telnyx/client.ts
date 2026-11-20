import "server-only";

import { TRPCError } from "@trpc/server";

import {
  SmsProviderError,
  type AvailableNumber,
  type OwnedNumber,
  type SmsProvider,
} from "../types";
import { parseTelnyxWebhook, telnyxStatus } from "./webhook";

// Telnyx REST v2 on the agency's one account (TELNYX_API_KEY on the api
// service). Each texting project gets its own messaging profile (so replies
// route back with the project's number) and one number bought in the hub.
// sms_profile_id = the messaging profile, sms_number_id = the number order id.

const BASE = "https://api.telnyx.com/v2";
const dev = process.env.NODE_ENV !== "production";

/** Where Telnyx posts message events. Override for a local tunnel. */
const telnyxWebhookUrl = () =>
  process.env.TELNYX_WEBHOOK_URL ||
  `${dev ? "http://localhost:3000" : "https://api.alisamadii.com"}/api/webhook/telnyx`;

type TelnyxErrorBody = { errors?: { code?: string; title?: string; detail?: string }[] };

async function telnyx<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env.TELNYX_API_KEY;
  if (!key) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Texting isn't configured (TELNYX_API_KEY)." });
  }
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => ({}))) as T & TelnyxErrorBody;
  if (!res.ok) {
    const first = json.errors?.[0];
    throw new SmsProviderError(
      first?.detail || first?.title || `Telnyx request failed (${res.status})`,
      res.status,
      first?.code
    );
  }
  return json;
}

/** US numbers that can text (SMS + MMS), optionally in one area code. */
async function searchNumbers(areaCode?: string): Promise<AvailableNumber[]> {
  const params = new URLSearchParams({
    "filter[country_code]": "US",
    "filter[limit]": "20",
  });
  params.append("filter[features][]", "sms");
  params.append("filter[features][]", "mms");
  if (areaCode) params.set("filter[national_destination_code]", areaCode);
  const { data } = await telnyx<{
    data: {
      phone_number: string;
      region_information?: { region_type: string; region_name: string }[];
      cost_information?: { monthly_cost?: string; upfront_cost?: string };
    }[];
  }>(`/available_phone_numbers?${params}`);
  const region = (n: (typeof data)[number], type: string) =>
    n.region_information?.find((r) => r.region_type === type)?.region_name ?? null;
  return data.map((n) => ({
    phoneNumber: n.phone_number,
    locality: region(n, "rate_center") ?? region(n, "location"),
    region: region(n, "state"),
    monthlyCost: n.cost_information?.monthly_cost ?? null,
    upfrontCost: n.cost_information?.upfront_cost ?? null,
  }));
}

/** One messaging profile per project; its webhook brings replies back. */
async function createMessagingProfile(name: string) {
  const { data } = await telnyx<{ data: { id: string } }>("/messaging_profiles", {
    method: "POST",
    body: {
      name,
      enabled: true,
      whitelisted_destinations: ["US", "CA"],
      webhook_url: telnyxWebhookUrl(),
      webhook_api_version: "2",
    },
  });
  return data.id;
}

/** Buys a number straight onto the project's messaging profile. */
async function orderNumber(phoneNumber: string, messagingProfileId: string) {
  const { data } = await telnyx<{ data: { id: string; status: string } }>("/number_orders", {
    method: "POST",
    body: {
      phone_numbers: [{ phone_number: phoneNumber }],
      messaging_profile_id: messagingProfileId,
    },
  });
  return { orderId: data.id, status: data.status };
}

/** Active numbers already on the agency account (bought in the Telnyx portal or the hub). */
async function listOwnedNumbers(): Promise<OwnedNumber[]> {
  const params = new URLSearchParams({ "filter[status]": "active", "page[size]": "250" });
  const { data } = await telnyx<{
    data: {
      id: string;
      phone_number: string;
      messaging_profile_id?: string | null;
      messaging_profile_name?: string | null;
    }[];
  }>(`/phone_numbers?${params}`);
  return data.map((n) => ({
    id: n.id,
    phoneNumber: n.phone_number,
    profileId: n.messaging_profile_id || null,
    profileName: n.messaging_profile_name || null,
  }));
}

/** Puts an existing number on a messaging profile. */
async function assignNumberProfile(numberId: string, messagingProfileId: string) {
  await telnyx(`/phone_numbers/${encodeURIComponent(numberId)}/messaging`, {
    method: "PATCH",
    body: { messaging_profile_id: messagingProfileId },
  });
}

/** Points an existing (portal-made) profile's webhook at the hub so replies come back. */
async function setProfileWebhook(messagingProfileId: string) {
  await telnyx(`/messaging_profiles/${encodeURIComponent(messagingProfileId)}`, {
    method: "PATCH",
    body: { webhook_url: telnyxWebhookUrl(), webhook_api_version: "2" },
  });
}

/** Gives a number back to Telnyx (stops the monthly charge). */
async function releaseNumber(phoneNumber: string) {
  const params = new URLSearchParams({ "filter[phone_number]": phoneNumber });
  const { data } = await telnyx<{ data: { id: string }[] }>(`/phone_numbers?${params}`);
  for (const n of data) {
    await telnyx(`/phone_numbers/${encodeURIComponent(n.id)}`, { method: "DELETE" });
  }
}

/** Sends a text (MMS when there are media URLs). Returns the Telnyx message id. */
async function sendSms(input: {
  from: string;
  to: string;
  text: string;
  mediaUrls?: string[];
  messagingProfileId?: string | null;
}) {
  const { data } = await telnyx<{ data: { id: string; to?: { status?: string }[] } }>("/messages", {
    method: "POST",
    body: {
      from: input.from,
      to: input.to,
      text: input.text,
      ...(input.mediaUrls?.length && { media_urls: input.mediaUrls, type: "MMS" }),
      ...(input.messagingProfileId && { messaging_profile_id: input.messagingProfileId }),
    },
  });
  return { id: data.id, status: data.to?.[0]?.status };
}

export const telnyxProvider: SmsProvider = {
  id: "telnyx",
  name: "Telnyx",
  envHint: "TELNYX_API_KEY and TELNYX_PUBLIC_KEY",
  isConfigured: () => Boolean(process.env.TELNYX_API_KEY),
  searchNumbers,
  listOwnedNumbers,

  async buyNumber({ phoneNumber, projectId, profileId }) {
    // One profile per project, kept across number changes.
    const profile = profileId ?? (await createMessagingProfile(`Hub ${projectId}`));
    const order = await orderNumber(phoneNumber, profile);
    return { phoneNumber, numberId: order.orderId, profileId: profile };
  },

  // Keeps the number's own messaging profile (or puts it on this project's)
  // and points that profile's webhook at the hub.
  async linkNumber({ number, projectId, profileId }) {
    let profile = number.profileId;
    if (profile) {
      await setProfileWebhook(profile);
    } else {
      profile = profileId ?? (await createMessagingProfile(`Hub ${projectId}`));
      await assignNumberProfile(number.id, profile);
    }
    return { phoneNumber: number.phoneNumber, numberId: number.id, profileId: profile };
  },

  releaseNumber: ({ phoneNumber }) => releaseNumber(phoneNumber),

  async send({ from, to, text, mediaUrls, profileId }) {
    const sent = await sendSms({ from, to, text, mediaUrls, messagingProfileId: profileId });
    return { id: sent.id, status: telnyxStatus(sent.status) };
  },

  fetchMedia: (url) => fetch(url, { signal: AbortSignal.timeout(15_000) }),

  parseWebhook(rawBody, headers) {
    const publicKey = process.env.TELNYX_PUBLIC_KEY;
    if (!publicKey) return { ok: false, status: 503, reason: "TELNYX_PUBLIC_KEY is not set" };
    const events = parseTelnyxWebhook({
      rawBody,
      signature: headers.get("telnyx-signature-ed25519"),
      timestamp: headers.get("telnyx-timestamp"),
      publicKey,
    });
    return events ? { ok: true, events } : { ok: false, status: 401, reason: "Invalid signature" };
  },
};
