import "server-only";

import { TRPCError } from "@trpc/server";

// Telnyx REST v2 on the agency's one account (TELNYX_API_KEY on the api
// service). Each texting project gets its own messaging profile (so replies
// route back with the project's number) and one number bought in the hub.

const BASE = "https://api.telnyx.com/v2";
const dev = process.env.NODE_ENV !== "production";

/** Where Telnyx posts message events. Override for a local tunnel. */
export const telnyxWebhookUrl = () =>
  process.env.TELNYX_WEBHOOK_URL ||
  `${dev ? "http://localhost:3000" : "https://api.alisamadii.com"}/api/webhook/telnyx`;

export const isTelnyxConfigured = () => Boolean(process.env.TELNYX_API_KEY);

export class TelnyxError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

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
    throw new TelnyxError(first?.detail || first?.title || `Telnyx request failed (${res.status})`, res.status);
  }
  return json;
}

export type AvailableNumber = {
  phoneNumber: string;
  locality: string | null;
  region: string | null;
  monthlyCost: string | null;
  upfrontCost: string | null;
};

/** US numbers that can text (SMS + MMS), optionally in one area code. */
export async function searchNumbers(areaCode?: string): Promise<AvailableNumber[]> {
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
export async function createMessagingProfile(name: string) {
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

export async function deleteMessagingProfile(id: string) {
  await telnyx(`/messaging_profiles/${encodeURIComponent(id)}`, { method: "DELETE" }).catch((error) => {
    if (!(error instanceof TelnyxError && error.status === 404)) throw error;
  });
}

/** Buys a number straight onto the project's messaging profile. */
export async function orderNumber(phoneNumber: string, messagingProfileId: string) {
  const { data } = await telnyx<{ data: { id: string; status: string } }>("/number_orders", {
    method: "POST",
    body: {
      phone_numbers: [{ phone_number: phoneNumber }],
      messaging_profile_id: messagingProfileId,
    },
  });
  return { orderId: data.id, status: data.status };
}

export type OwnedNumber = {
  id: string;
  phoneNumber: string;
  profileId: string | null;
  profileName: string | null;
};

/** Active numbers already on the agency account (bought in the Telnyx portal or the hub). */
export async function listOwnedNumbers(): Promise<OwnedNumber[]> {
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
export async function assignNumberProfile(numberId: string, messagingProfileId: string) {
  await telnyx(`/phone_numbers/${encodeURIComponent(numberId)}/messaging`, {
    method: "PATCH",
    body: { messaging_profile_id: messagingProfileId },
  });
}

/** Points an existing (portal-made) profile's webhook at the hub so replies come back. */
export async function setProfileWebhook(messagingProfileId: string) {
  await telnyx(`/messaging_profiles/${encodeURIComponent(messagingProfileId)}`, {
    method: "PATCH",
    body: { webhook_url: telnyxWebhookUrl(), webhook_api_version: "2" },
  });
}

/** Gives a number back to Telnyx (stops the monthly charge). */
export async function releaseNumber(phoneNumber: string) {
  const params = new URLSearchParams({ "filter[phone_number]": phoneNumber });
  const { data } = await telnyx<{ data: { id: string }[] }>(`/phone_numbers?${params}`);
  for (const n of data) {
    await telnyx(`/phone_numbers/${encodeURIComponent(n.id)}`, { method: "DELETE" });
  }
}

/** Sends a text (MMS when there are media URLs). Returns the Telnyx message id. */
export async function sendSms(input: {
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
