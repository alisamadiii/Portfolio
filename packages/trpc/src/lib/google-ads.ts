import "server-only";

import { createHash } from "node:crypto";

import type { AgencyLeadAdClick } from "@workspace/drizzle/schema";

// ─── Google Ads API (agency MCC) ─────────────────────────────────
// Raw REST, no SDK. Auth is agency-level: Ali's manager (MCC) account's
// refresh token, so client accounts linked under the MCC need no OAuth of
// their own. Every call sends login-customer-id = the MCC.

// `||` not `??`: an empty GOOGLE_ADS_API_VERSION= line must fall back too.
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v25";
const BASE = `https://googleads.googleapis.com/${API_VERSION}`;

export class GoogleAdsError extends Error {}

export const isGoogleAdsConfigured = () =>
  Boolean(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN &&
      process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
  );

// "123-456-7890" → "1234567890"
export const normalizeCustomerId = (id: string) => id.replace(/\D/g, "");

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new GoogleAdsError(
      `Google Ads auth failed (${res.status}): ${(await res.text()).slice(0, 300)}`
    );
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

async function ads<T>(path: string, body: unknown): Promise<T> {
  if (!isGoogleAdsConfigured()) {
    throw new GoogleAdsError("Google Ads API is not configured.");
  }

  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      "login-customer-id": normalizeCustomerId(
        process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!
      ),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new GoogleAdsError(
      `Google Ads API error (${res.status}): ${(await res.text()).slice(0, 500)}`
    );
  }
  return (await res.json()) as T;
}

// searchStream returns an array of batches, each with its own results.
async function query<T>(customerId: string, gaql: string): Promise<T[]> {
  const batches = await ads<{ results?: T[] }[]>(
    `customers/${normalizeCustomerId(customerId)}/googleAds:searchStream`,
    { query: gaql }
  );
  return batches.flatMap((batch) => batch.results ?? []);
}

// ─── Offline conversions ─────────────────────────────────────────

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

// Google's normalization: trim + lowercase emails; phones in E.164.
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // Bare 10-digit numbers are assumed US.
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
};

// "2026-10-22 14:05:00+00:00", the format uploads require.
const toAdsDateTime = (date: Date) =>
  `${date.toISOString().slice(0, 19).replace("T", " ")}+00:00`;

export type ClosedDeal = {
  customerId: string;
  conversionAction: string;
  valueCents: number;
  currency: string;
  convertedAt: Date;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  email?: string | null;
  phone?: string | null;
};

/**
 * Report a won lead to Google Ads as a closed-deal conversion. Sends the click
 * ID when the capture script saw one, plus hashed email/phone so enhanced
 * conversions for leads can match when it didn't.
 */
export async function uploadClosedDeal(deal: ClosedDeal) {
  const userIdentifiers: Record<string, string>[] = [];
  if (deal.email) {
    userIdentifiers.push({ hashedEmail: sha256(normalizeEmail(deal.email)) });
  }
  const phone = deal.phone ? normalizePhone(deal.phone) : null;
  if (phone) userIdentifiers.push({ hashedPhoneNumber: sha256(phone) });

  if (!deal.gclid && !deal.gbraid && !deal.wbraid && !userIdentifiers.length) {
    throw new GoogleAdsError(
      "Nothing to match on: this lead has no click ID, email or phone."
    );
  }

  const conversion: Record<string, unknown> = {
    conversionAction: deal.conversionAction,
    conversionDateTime: toAdsDateTime(deal.convertedAt),
    conversionValue: deal.valueCents / 100,
    currencyCode: deal.currency,
  };
  // Only one click ID per conversion is allowed.
  if (deal.gclid) conversion.gclid = deal.gclid;
  else if (deal.gbraid) conversion.gbraid = deal.gbraid;
  else if (deal.wbraid) conversion.wbraid = deal.wbraid;
  if (userIdentifiers.length) conversion.userIdentifiers = userIdentifiers;

  const res = await ads<{ partialFailureError?: { message?: string } }>(
    `customers/${normalizeCustomerId(deal.customerId)}:uploadClickConversions`,
    { conversions: [conversion], partialFailure: true }
  );
  if (res.partialFailureError) {
    throw new GoogleAdsError(
      res.partialFailureError.message ?? "Google Ads rejected the conversion."
    );
  }
}

// ─── Reporting ───────────────────────────────────────────────────

type MetricsRow = {
  metrics?: {
    costMicros?: string;
    clicks?: string;
    impressions?: string;
    conversions?: number;
  };
};

const toMetrics = (row: MetricsRow) => ({
  cost: Number(row.metrics?.costMicros ?? 0) / 1_000_000,
  clicks: Number(row.metrics?.clicks ?? 0),
  impressions: Number(row.metrics?.impressions ?? 0),
  conversions: Number(row.metrics?.conversions ?? 0),
});

const CAMPAIGN_ID = /^\d+$/;

/**
 * Spend and performance for a date range (YYYY-MM-DD), by day and by campaign.
 * `campaignId` scopes totals + days to one campaign; the campaign list always
 * covers every non-removed campaign, including ones with no activity.
 */
export async function getAdsStats(
  customerId: string,
  from: string,
  to: string,
  campaignId?: string
) {
  if (campaignId && !CAMPAIGN_ID.test(campaignId)) {
    throw new GoogleAdsError("Invalid campaign id.");
  }
  const range = `segments.date BETWEEN '${from}' AND '${to}'`;
  const metrics =
    "metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions";

  const [daily, campaignMetrics, campaignList, account] = await Promise.all([
    query<MetricsRow & { segments?: { date?: string } }>(
      customerId,
      campaignId
        ? `SELECT segments.date, ${metrics} FROM campaign WHERE ${range} AND campaign.id = ${campaignId} ORDER BY segments.date`
        : `SELECT segments.date, ${metrics} FROM customer WHERE ${range} ORDER BY segments.date`
    ),
    query<MetricsRow & { campaign?: { id?: string } }>(
      customerId,
      `SELECT campaign.id, ${metrics} FROM campaign WHERE ${range} AND campaign.status != 'REMOVED'`
    ),
    // Metrics queries skip campaigns with no activity, so list them separately.
    query<{
      campaign?: { id?: string; name?: string; status?: string; advertisingChannelType?: string };
    }>(
      customerId,
      "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type FROM campaign WHERE campaign.status != 'REMOVED'"
    ),
    query<{ customer?: { id?: string; descriptiveName?: string; currencyCode?: string } }>(
      customerId,
      "SELECT customer.id, customer.descriptive_name, customer.currency_code FROM customer LIMIT 1"
    ),
  ]);

  const days = daily.map((row) => ({
    date: row.segments?.date ?? "",
    ...toMetrics(row),
  }));
  const totals = days.reduce(
    (sum, day) => ({
      cost: sum.cost + day.cost,
      clicks: sum.clicks + day.clicks,
      impressions: sum.impressions + day.impressions,
      conversions: sum.conversions + day.conversions,
    }),
    { cost: 0, clicks: 0, impressions: 0, conversions: 0 }
  );

  const metricsById = new Map(
    campaignMetrics.map((row) => [row.campaign?.id ?? "", toMetrics(row)])
  );
  const empty = { cost: 0, clicks: 0, impressions: 0, conversions: 0 };
  const customer = account[0]?.customer;

  return {
    account: {
      id: customer?.id ?? normalizeCustomerId(customerId),
      name: customer?.descriptiveName ?? "",
    },
    currency: customer?.currencyCode ?? "USD",
    totals,
    days,
    campaigns: campaignList
      .map((row) => {
        const id = row.campaign?.id ?? "";
        return {
          id,
          name: row.campaign?.name ?? "",
          status: row.campaign?.status ?? "",
          channel: row.campaign?.advertisingChannelType ?? "",
          ...(metricsById.get(id) ?? empty),
        };
      })
      .sort(
        (a, b) =>
          Number(b.status === "ENABLED") - Number(a.status === "ENABLED") ||
          b.cost - a.cost
      ),
  };
}

// ─── Manager account ─────────────────────────────────────────────

/** Client (non-manager) accounts linked under the agency MCC. */
export async function listManagedAccounts() {
  const mcc = normalizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "");
  const rows = await query<{
    customerClient?: {
      id?: string;
      descriptiveName?: string;
      manager?: boolean;
      testAccount?: boolean;
      status?: string;
      currencyCode?: string;
    };
  }>(
    mcc,
    "SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.test_account, customer_client.status, customer_client.currency_code FROM customer_client WHERE customer_client.manager = FALSE"
  );
  return rows
    .map((row) => ({
      id: row.customerClient?.id ?? "",
      name: row.customerClient?.descriptiveName ?? "",
      status: row.customerClient?.status ?? "",
      currency: row.customerClient?.currencyCode ?? "",
      testAccount: Boolean(row.customerClient?.testAccount),
    }))
    .filter((account) => account.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Ad clicks ───────────────────────────────────────────────────

const GCLID = /^[\w-]{10,200}$/;

type ClickRow = {
  clickView?: {
    gclid?: string;
    keywordInfo?: { text?: string; matchType?: string };
  };
  campaign?: { id?: string; name?: string };
  adGroup?: { id?: string; name?: string };
  segments?: { device?: string };
};

/**
 * Campaign, ad group and keyword behind each gclid, for clicks on one day
 * (YYYY-MM-DD, account time zone). click_view only allows a single day per
 * query and only keeps the last 90 days; clicks show up a few hours later.
 */
export async function lookupClicks(customerId: string, day: string, gclids: string[]) {
  const ids = [...new Set(gclids)].filter((id) => GCLID.test(id));
  if (!ids.length) return new Map<string, AgencyLeadAdClick>();

  const rows = await query<ClickRow>(
    customerId,
    `SELECT click_view.gclid, click_view.keyword_info.text, click_view.keyword_info.match_type, campaign.id, campaign.name, ad_group.id, ad_group.name, segments.device FROM click_view WHERE segments.date = '${day}' AND click_view.gclid IN (${ids.map((id) => `'${id}'`).join(", ")})`
  );

  return new Map(
    rows
      .filter((row) => row.clickView?.gclid)
      .map((row): [string, AgencyLeadAdClick] => [
        row.clickView!.gclid!,
        {
          campaignId: row.campaign?.id,
          campaignName: row.campaign?.name,
          adGroupId: row.adGroup?.id,
          adGroupName: row.adGroup?.name,
          keyword: row.clickView?.keywordInfo?.text,
          matchType: row.clickView?.keywordInfo?.matchType,
          device: row.segments?.device,
        },
      ])
  );
}

/** Upload-type conversion actions in a client account, for the admin picker. */
export async function listConversionActions(customerId: string) {
  const rows = await query<{
    conversionAction?: { resourceName?: string; name?: string; type?: string; status?: string };
  }>(
    customerId,
    "SELECT conversion_action.resource_name, conversion_action.name, conversion_action.type, conversion_action.status FROM conversion_action WHERE conversion_action.status = 'ENABLED'"
  );
  return rows.map((row) => ({
    resourceName: row.conversionAction?.resourceName ?? "",
    name: row.conversionAction?.name ?? "",
    type: row.conversionAction?.type ?? "",
  }));
}
