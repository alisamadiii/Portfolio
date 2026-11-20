// One contract for every texting provider. The Leads inbox, the agency.sms
// router and the hub UI only talk to this; each provider (sms/<id>/) maps its
// own API onto it. Switch providers with SMS_PROVIDER on the api service.
//
// agency_client columns mean the same for every provider:
//   sms_number     the number in E.164
//   sms_number_id  the provider's id for that number
//   sms_profile_id the provider's routing handle, if it has one (else null)

export const SMS_PROVIDER_IDS = ["zernio", "telnyx"] as const;
export type SmsProviderId = (typeof SMS_PROVIDER_IDS)[number];

export type SmsStatus = "queued" | "sent" | "delivered" | "failed";

export type AvailableNumber = {
  phoneNumber: string;
  locality: string | null;
  region: string | null;
  monthlyCost: string | null;
  upfrontCost: string | null;
};

export type OwnedNumber = {
  id: string;
  phoneNumber: string;
  profileId: string | null;
  profileName: string | null;
};

/** What a project row keeps after buying or linking a number. */
export type SmsNumberLink = {
  phoneNumber: string;
  numberId: string | null;
  profileId: string | null;
};

export type SmsMedia = { url: string; contentType?: string };

/** A verified webhook event, provider details stripped. */
export type SmsEvent =
  | { type: "inbound"; messageId: string; to: string; from: string; text: string; media: SmsMedia[] }
  | { type: "status"; messageId: string; status: SmsStatus; error: string | null };

export type SmsWebhookResult =
  | { ok: true; events: SmsEvent[] }
  | { ok: false; status: 401 | 503; reason: string };

export interface SmsProvider {
  id: SmsProviderId;
  /** Shown in the hub ("A number on the agency Zernio account"). */
  name: string;
  /** Env var(s) the provider needs, for the "not configured" hint. */
  envHint: string;
  isConfigured(): boolean;
  /** US numbers that can text, optionally in one area code. */
  searchNumbers(areaCode?: string): Promise<AvailableNumber[]>;
  /** Numbers already on the agency account. */
  listOwnedNumbers(): Promise<OwnedNumber[]>;
  /** Buys a number for a project and routes its replies to the hub. */
  buyNumber(input: { phoneNumber: string; projectId: string; profileId: string | null }): Promise<SmsNumberLink>;
  /** Routes an owned number's replies to the hub for a project. */
  linkNumber(input: { number: OwnedNumber; projectId: string; profileId: string | null }): Promise<SmsNumberLink>;
  /** Gives the number back (stops the monthly charge). */
  releaseNumber(input: { phoneNumber: string; numberId: string | null }): Promise<void>;
  send(input: {
    from: string;
    to: string;
    text: string;
    mediaUrls?: string[];
    profileId: string | null;
    /** Same key = same send, so a retry never texts twice. */
    idempotencyKey: string;
  }): Promise<{ id: string; status: SmsStatus }>;
  /** Fetches inbound media (some providers need auth on their media links). */
  fetchMedia(url: string): Promise<Response>;
  /** Verifies and normalizes one webhook delivery. */
  parseWebhook(rawBody: string, headers: Headers): SmsWebhookResult;
}

export class SmsProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
  }
}
