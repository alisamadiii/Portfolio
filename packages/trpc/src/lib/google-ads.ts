import "server-only";

import { createHash } from "node:crypto";

import type { AgencyLeadAdClick } from "@workspace/drizzle/schema";

import type { ActionSpec, EditableFields } from "./agency/conversion-presets";

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

export type ConversionUpload = {
  customerId: string;
  conversionAction: string;
  /** Omitted for stages without a value (a new or qualified lead). */
  valueCents?: number;
  currency: string;
  convertedAt: Date;
  /** Same id twice = Google keeps one, so retries never double count. */
  transactionId: string;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  email?: string | null;
  phone?: string | null;
};

const DATA_MANAGER_URL = "https://datamanager.googleapis.com/v1/events:ingest";

/**
 * Report a lead stage (new lead, qualified, closed deal) to Google Ads as an
 * offline conversion. Google requires new integrations to use the Data Manager
 * API for this (uploadClickConversions is closed to them), which needs the
 * refresh token to carry the datamanager scope as well as adwords.
 * Sends the click ID when the capture script saw one, plus hashed email/phone
 * so enhanced conversions for leads can match when it didn't.
 */
export async function uploadConversion(deal: ConversionUpload) {
  if (!isGoogleAdsConfigured()) {
    throw new GoogleAdsError("Google Ads API is not configured.");
  }

  const userIdentifiers: Record<string, string>[] = [];
  if (deal.email) userIdentifiers.push({ emailAddress: sha256(normalizeEmail(deal.email)) });
  const phone = deal.phone ? normalizePhone(deal.phone) : null;
  if (phone) userIdentifiers.push({ phoneNumber: sha256(phone) });

  if (!deal.gclid && !deal.gbraid && !deal.wbraid && !userIdentifiers.length) {
    throw new GoogleAdsError("Nothing to match on: this lead has no click ID, email or phone.");
  }

  const event: Record<string, unknown> = {
    eventTimestamp: deal.convertedAt.toISOString(),
    transactionId: deal.transactionId,
  };
  // Only one click ID per conversion is allowed.
  if (deal.gclid) event.adIdentifiers = { gclid: deal.gclid };
  else if (deal.gbraid) event.adIdentifiers = { gbraid: deal.gbraid };
  else if (deal.wbraid) event.adIdentifiers = { wbraid: deal.wbraid };
  if (userIdentifiers.length) event.userData = { userIdentifiers };
  if (deal.valueCents) {
    event.conversionValue = deal.valueCents / 100;
    event.currency = deal.currency;
  }

  const account = (accountId: string) => ({
    accountType: "GOOGLE_ADS",
    accountId: normalizeCustomerId(accountId),
  });
  const res = await fetch(DATA_MANAGER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      destinations: [
        {
          operatingAccount: account(deal.customerId),
          loginAccount: account(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!),
          // "customers/1/conversionActions/2" → "2"
          productDestinationId: deal.conversionAction.split("/").pop(),
        },
      ],
      encoding: "HEX",
      events: [event],
    }),
  });
  if (res.status === 403 && (await res.clone().text()).includes("SCOPE_INSUFFICIENT")) {
    throw new GoogleAdsError(
      "Google Ads refresh token is missing the datamanager scope. Mint a new one with both adwords and datamanager scopes."
    );
  }
  if (!res.ok) {
    throw new GoogleAdsError(
      `Google Ads Data Manager error (${res.status}): ${(await res.text()).slice(0, 500)}`
    );
  }
  // A 200 only means the payload was received; processing is async. The
  // request id lets us confirm later that Google actually accepted it.
  const body = (await res.json().catch(() => null)) as { requestId?: string } | null;
  return { requestId: body?.requestId ?? null };
}

/**
 * Processing outcome of an earlier events:ingest call. Google recommends
 * waiting at least 30 minutes after the upload before checking.
 */
export async function retrieveIngestStatus(requestId: string) {
  const res = await fetch(
    "https://datamanager.googleapis.com/v1/requestStatus:retrieve",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestId }),
    }
  );
  if (!res.ok) {
    throw new GoogleAdsError(
      `Google Ads Data Manager status error (${res.status}): ${(await res.text()).slice(0, 300)}`
    );
  }
  const body = (await res.json()) as {
    requestStatusPerDestination?: import("./agency/ingest-status").IngestDestinationStatus[];
  };
  return body.requestStatusPerDestination ?? [];
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

/** Light campaign list for the sidebar filter: no metrics. */
export async function listCampaigns(customerId: string) {
  const rows = await query<{
    campaign?: { id?: string; name?: string; status?: string };
  }>(
    customerId,
    "SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.name"
  );
  return rows
    .map((row) => ({
      id: row.campaign?.id ?? "",
      name: row.campaign?.name ?? "",
      status: row.campaign?.status ?? "",
    }))
    .sort((a, b) => Number(b.status === "ENABLED") - Number(a.status === "ENABLED"));
}

// ─── Budget pacing ───────────────────────────────────────────────

type BudgetRow = {
  campaign?: { id?: string; name?: string; status?: string; advertisingChannelType?: string };
  campaignBudget?: { resourceName?: string; amountMicros?: string };
  metrics?: { costMicros?: string; searchBudgetLostImpressionShare?: number };
};

/** Month-to-date spend per campaign plus each campaign's daily budget. */
export async function getBudgetPacing(customerId: string) {
  const now = new Date();
  const first = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().slice(0, 10);
  const mtd = `segments.date BETWEEN '${first}' AND '${today}'`;

  const [campaigns, costs, lostShare, account] = await Promise.all([
    query<BudgetRow>(
      customerId,
      "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.resource_name, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED'"
    ),
    query<BudgetRow>(
      customerId,
      `SELECT campaign.id, metrics.cost_micros FROM campaign WHERE ${mtd}`
    ),
    // How much search impression share each campaign lost to budget, last 7 days.
    query<BudgetRow>(
      customerId,
      "SELECT campaign.id, metrics.search_budget_lost_impression_share FROM campaign WHERE segments.date DURING LAST_7_DAYS"
    ),
    query<{ customer?: { currencyCode?: string } }>(
      customerId,
      "SELECT customer.currency_code FROM customer LIMIT 1"
    ),
  ]);

  const costById = new Map(
    costs.map((row) => [row.campaign?.id ?? "", Number(row.metrics?.costMicros ?? 0)])
  );
  const lostById = new Map(
    lostShare.map((row) => [
      row.campaign?.id ?? "",
      Number(row.metrics?.searchBudgetLostImpressionShare ?? 0),
    ])
  );

  const rows = campaigns
    .map((row) => {
      const id = row.campaign?.id ?? "";
      return {
        id,
        name: row.campaign?.name ?? "",
        status: row.campaign?.status ?? "",
        channel: row.campaign?.advertisingChannelType ?? "",
        budgetResourceName: row.campaignBudget?.resourceName ?? "",
        dailyBudgetCents: Math.round(Number(row.campaignBudget?.amountMicros ?? 0) / 10_000),
        spentCents: Math.round((costById.get(id) ?? 0) / 10_000),
        budgetLostShare: lostById.get(id) ?? 0,
      };
    })
    .sort(
      (a, b) =>
        Number(b.status === "ENABLED") - Number(a.status === "ENABLED") ||
        b.spentCents - a.spentCents
    );

  return {
    currency: account[0]?.customer?.currencyCode ?? "USD",
    spentCents: rows.reduce((sum, row) => sum + row.spentCents, 0),
    campaigns: rows,
  };
}

/** Change a campaign's daily budget. Note: a shared budget changes every campaign on it. */
export async function setCampaignBudget(
  customerId: string,
  budgetResourceName: string,
  dailyBudgetCents: number
) {
  await ads(
    `customers/${normalizeCustomerId(customerId)}/campaignBudgets:mutate`,
    {
      operations: [
        {
          updateMask: "amount_micros",
          update: {
            resourceName: budgetResourceName,
            amountMicros: String(dailyBudgetCents * 10_000),
          },
        },
      ],
    }
  );
}

// ─── Search terms ────────────────────────────────────────────────

type SearchTermRow = {
  searchTermView?: { searchTerm?: string; status?: string };
  campaign?: { id?: string; name?: string };
  metrics?: {
    costMicros?: string;
    clicks?: string;
    impressions?: string;
    conversions?: number;
  };
};

/**
 * What people actually searched before clicking, merged per term + campaign.
 * Google hides low-volume terms, so this is never the complete list.
 */
export async function getSearchTerms(
  customerId: string,
  from: string,
  to: string,
  campaignId?: string
) {
  if (campaignId && !CAMPAIGN_ID.test(campaignId)) {
    throw new GoogleAdsError("Invalid campaign id.");
  }
  const rows = await query<SearchTermRow>(
    customerId,
    `SELECT search_term_view.search_term, search_term_view.status, campaign.id, campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM search_term_view WHERE segments.date BETWEEN '${from}' AND '${to}'${campaignId ? ` AND campaign.id = ${campaignId}` : ""}`
  );

  // One row per ad group comes back; the page works per term + campaign.
  const merged = new Map<
    string,
    {
      term: string;
      status: string;
      campaignId: string;
      campaignName: string;
      costCents: number;
      clicks: number;
      impressions: number;
      conversions: number;
    }
  >();
  for (const row of rows) {
    const term = row.searchTermView?.searchTerm ?? "";
    const campaign = row.campaign?.id ?? "";
    const key = `${campaign}\n${term}`;
    const entry = merged.get(key) ?? {
      term,
      status: row.searchTermView?.status ?? "NONE",
      campaignId: campaign,
      campaignName: row.campaign?.name ?? "",
      costCents: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
    };
    entry.costCents += Math.round(Number(row.metrics?.costMicros ?? 0) / 10_000);
    entry.clicks += Number(row.metrics?.clicks ?? 0);
    entry.impressions += Number(row.metrics?.impressions ?? 0);
    entry.conversions += Number(row.metrics?.conversions ?? 0);
    // EXCLUDED on any ad group means the term is already blocked somewhere.
    if (row.searchTermView?.status === "EXCLUDED") entry.status = "EXCLUDED";
    merged.set(key, entry);
  }

  return [...merged.values()]
    .sort((a, b) => b.costCents - a.costCents || b.clicks - a.clicks)
    .slice(0, 300);
}

/** Block a search term with a campaign-level negative keyword. */
export async function addNegativeKeyword(
  customerId: string,
  campaignId: string,
  text: string,
  matchType: "EXACT" | "PHRASE"
) {
  if (!CAMPAIGN_ID.test(campaignId)) {
    throw new GoogleAdsError("Invalid campaign id.");
  }
  await ads(
    `customers/${normalizeCustomerId(customerId)}/campaignCriteria:mutate`,
    {
      operations: [
        {
          create: {
            campaign: `customers/${normalizeCustomerId(customerId)}/campaigns/${campaignId}`,
            negative: true,
            keyword: { text, matchType },
          },
        },
      ],
    }
  );
}

// ─── Alert signals ───────────────────────────────────────────────

const dateOffset = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Raw account signals the alert rules run on. */
export async function getAlertSignals(customerId: string) {
  const conversionsIn = async (from: string, to: string) => {
    const rows = await query<MetricsRow>(
      customerId,
      `SELECT metrics.conversions FROM customer WHERE segments.date BETWEEN '${from}' AND '${to}'`
    );
    return rows.reduce((sum, row) => sum + Number(row.metrics?.conversions ?? 0), 0);
  };

  const [last7, prior7, disapproved] = await Promise.all([
    conversionsIn(dateOffset(-7), dateOffset(-1)),
    conversionsIn(dateOffset(-14), dateOffset(-8)),
    query<{ adGroupAd?: { ad?: { id?: string } } }>(
      customerId,
      "SELECT ad_group_ad.ad.id FROM ad_group_ad WHERE ad_group_ad.policy_summary.approval_status = 'DISAPPROVED' AND ad_group_ad.status = 'ENABLED' AND ad_group.status = 'ENABLED' AND campaign.status = 'ENABLED'"
    ),
  ]);

  return {
    conversionsLast7: last7,
    conversionsPrior7: prior7,
    disapprovedAds: disapproved.length,
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

// ─── Conversion actions (Marketing > Conversions) ─────────────────

type ConversionActionRow = {
  conversionAction?: {
    resourceName?: string;
    id?: string;
    name?: string;
    type?: string;
    category?: string;
    status?: string;
    origin?: string;
    primaryForGoal?: boolean;
    countingType?: string;
    clickThroughLookbackWindowDays?: string;
    includeInConversionsMetric?: boolean;
    valueSettings?: { defaultValue?: number; alwaysUseDefaultValue?: boolean };
  };
  metrics?: { allConversions?: number; allConversionsValue?: number };
};

/**
 * Every non-removed conversion action with its settings, plus conversions in
 * the range, in the last 7 days and ever (for the tracking status).
 */
export async function getConversionActions(customerId: string, from: string, to: string) {
  const where = "conversion_action.status != 'REMOVED'";
  const [actions, inRange, last7, ever] = await Promise.all([
    query<ConversionActionRow>(
      customerId,
      `SELECT conversion_action.resource_name, conversion_action.id, conversion_action.name, conversion_action.type, conversion_action.category, conversion_action.status, conversion_action.origin, conversion_action.primary_for_goal, conversion_action.counting_type, conversion_action.click_through_lookback_window_days, conversion_action.include_in_conversions_metric, conversion_action.value_settings.default_value, conversion_action.value_settings.always_use_default_value FROM conversion_action WHERE ${where}`
    ),
    query<ConversionActionRow>(
      customerId,
      `SELECT conversion_action.resource_name, metrics.all_conversions, metrics.all_conversions_value FROM conversion_action WHERE ${where} AND segments.date BETWEEN '${from}' AND '${to}'`
    ),
    query<ConversionActionRow>(
      customerId,
      `SELECT conversion_action.resource_name, metrics.all_conversions FROM conversion_action WHERE ${where} AND segments.date DURING LAST_7_DAYS`
    ),
    query<ConversionActionRow>(
      customerId,
      `SELECT conversion_action.resource_name, metrics.all_conversions FROM conversion_action WHERE ${where}`
    ),
  ]);

  const sum = (rows: ConversionActionRow[], field: "allConversions" | "allConversionsValue") => {
    const totals = new Map<string, number>();
    for (const row of rows) {
      const key = row.conversionAction?.resourceName ?? "";
      totals.set(key, (totals.get(key) ?? 0) + Number(row.metrics?.[field] ?? 0));
    }
    return totals;
  };
  const conversions = sum(inRange, "allConversions");
  const values = sum(inRange, "allConversionsValue");
  const recent = sum(last7, "allConversions");
  const lifetime = sum(ever, "allConversions");

  return actions.map(({ conversionAction: a = {} }) => {
    const resourceName = a.resourceName ?? "";
    return {
      resourceName,
      id: a.id ?? "",
      name: a.name ?? "",
      type: a.type ?? "UNKNOWN",
      category: a.category ?? "DEFAULT",
      status: a.status ?? "ENABLED",
      origin: a.origin ?? "",
      primaryForGoal: Boolean(a.primaryForGoal),
      countingType: a.countingType ?? "ONE_PER_CLICK",
      clickThroughLookbackWindowDays: Number(a.clickThroughLookbackWindowDays ?? 0),
      includeInConversionsMetric: Boolean(a.includeInConversionsMetric),
      defaultValue: Number(a.valueSettings?.defaultValue ?? 0),
      allConversions: conversions.get(resourceName) ?? 0,
      allConversionsValue: values.get(resourceName) ?? 0,
      last7Days: recent.get(resourceName) ?? 0,
      everConverted: (lifetime.get(resourceName) ?? 0) > 0,
    };
  });
}

type UploadSummaryRow = {
  offlineConversionUploadConversionActionSummary?: {
    conversionActionName?: string;
    status?: string;
    successfulEventCount?: string;
    pendingEventCount?: string;
    totalEventCount?: string;
  };
};

/**
 * Google's own health report for offline conversion uploads, per action.
 * Empty when the account has never received uploads.
 */
export async function getUploadHealth(customerId: string) {
  const rows = await query<UploadSummaryRow>(
    customerId,
    "SELECT offline_conversion_upload_conversion_action_summary.conversion_action_name, offline_conversion_upload_conversion_action_summary.status, offline_conversion_upload_conversion_action_summary.successful_event_count, offline_conversion_upload_conversion_action_summary.pending_event_count, offline_conversion_upload_conversion_action_summary.total_event_count FROM offline_conversion_upload_conversion_action_summary"
  );
  return rows.map(({ offlineConversionUploadConversionActionSummary: s = {} }) => ({
    actionName: s.conversionActionName ?? "",
    status: s.status ?? "",
    successful: Number(s.successfulEventCount ?? 0),
    pending: Number(s.pendingEventCount ?? 0),
    total: Number(s.totalEventCount ?? 0),
  }));
}

/** Every action's name, including removed ones (their names stay reserved). */
export async function listConversionActionNames(customerId: string) {
  const rows = await query<ConversionActionRow>(
    customerId,
    "SELECT conversion_action.resource_name, conversion_action.name, conversion_action.status FROM conversion_action"
  );
  return rows.map(({ conversionAction: a = {} }) => ({
    resourceName: a.resourceName ?? "",
    name: a.name ?? "",
    status: a.status ?? "",
  }));
}

export type ConversionActionSummary = Awaited<ReturnType<typeof getConversionActions>>[number];

const actionBody = (spec: ActionSpec) => ({
  name: spec.name,
  type: spec.type,
  category: spec.category,
  status: "ENABLED",
  countingType: spec.countingType,
  clickThroughLookbackWindowDays: spec.clickThroughLookbackWindowDays,
  primaryForGoal: spec.primaryForGoal,
  // Call actions must always use their default value.
  valueSettings:
    spec.type === "AD_CALL"
      ? { defaultValue: spec.defaultValue || 1, alwaysUseDefaultValue: true }
      : { defaultValue: spec.defaultValue, alwaysUseDefaultValue: false },
  ...(spec.type === "AD_CALL" ? { phoneCallDurationSeconds: 60 } : {}),
});

async function mutateConversionActions(customerId: string, operations: unknown[]) {
  const res = await ads<{ results?: { resourceName?: string }[] }>(
    `customers/${normalizeCustomerId(customerId)}/conversionActions:mutate`,
    { operations }
  );
  return (res.results ?? []).map((result) => result.resourceName ?? "");
}

/** Creates the actions in one request (all or nothing); returns their resource names in order. */
export const createConversionActions = (customerId: string, specs: ActionSpec[]) =>
  specs.length
    ? mutateConversionActions(
        customerId,
        specs.map((spec) => ({ create: actionBody(spec) }))
      )
    : Promise.resolve([]);

export const updateConversionAction = (
  customerId: string,
  resourceName: string,
  update: { body: Partial<Record<keyof EditableFields | "valueSettings", unknown>>; updateMask: string }
) =>
  mutateConversionActions(customerId, [
    { update: { resourceName, ...update.body }, updateMask: update.updateMask },
  ]);

/** Google keeps the action's history; it just stops counting. */
export const removeConversionAction = (customerId: string, resourceName: string) =>
  mutateConversionActions(customerId, [{ remove: resourceName }]);
