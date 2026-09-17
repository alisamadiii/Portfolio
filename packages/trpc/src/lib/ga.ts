import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { account } from "@workspace/drizzle/schema";

// Per-client Google Analytics reading. Unlike @workspace/google-analytics
// (send-only Measurement Protocol), this reads a client's GA4 property via the
// Data API using the OAuth token Better Auth stored when the connecting user
// granted the analytics.readonly scope. No SDK — raw fetch, matching the
// usesend.ts / places.ts clients.

const ADMIN_BASE = "https://analyticsadmin.googleapis.com/v1beta";
const DATA_BASE = "https://analyticsdata.googleapis.com/v1beta";

const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

/** The connected Google token is missing/expired/unscoped — the UI must prompt a reconnect. */
export const RECONNECT = () =>
  new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Google Analytics needs to be reconnected.",
  });

/**
 * Fetch a usable Google access token for a specific user, refreshing it via the
 * stored refresh token when needed. Throws RECONNECT when the user has no linked
 * Google account or the token can't be refreshed (revoked / never offline).
 *
 * A user can hold multiple google rows (accountLinking allows linking a
 * different Google account than the sign-in one), and Better Auth's
 * getAccessToken without an accountId just takes the first — which may be the
 * unscoped sign-in account. Pick the row whose scope actually includes
 * analytics.readonly and pin it via accountId.
 */
export async function getGoogleAccessToken(userId: string): Promise<string> {
  if (!userId) throw RECONNECT();
  const rows = await db
    .select({ accountId: account.accountId, scope: account.scope })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")));
  const scoped = rows.find((row) => row.scope?.includes(GA_SCOPE));
  if (!scoped) throw RECONNECT();
  try {
    const res = await auth.api.getAccessToken({
      body: { providerId: "google", userId, accountId: scoped.accountId },
    });
    const token = (res as { accessToken?: string } | null)?.accessToken;
    if (!token) throw RECONNECT();
    return token;
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    throw RECONNECT();
  }
}

async function ga<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401 || res.status === 403) throw RECONNECT();
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: `Google Analytics API error (${res.status}): ${detail.slice(0, 300)}`,
    });
  }
  return (await res.json()) as T;
}

export type Ga4Property = {
  /** Numeric property id, e.g. "123456789". */
  propertyId: string;
  displayName: string;
  account: string;
};

/**
 * List every GA4 property the token's user can read, for the connect dropdown.
 * accountSummaries returns accounts each with their propertySummaries.
 */
export async function listGa4Properties(accessToken: string): Promise<Ga4Property[]> {
  type Resp = {
    accountSummaries?: {
      displayName?: string;
      propertySummaries?: { property?: string; displayName?: string }[];
    }[];
  };
  const data = await ga<Resp>(
    `${ADMIN_BASE}/accountSummaries?pageSize=200`,
    accessToken
  );
  const out: Ga4Property[] = [];
  for (const account of data.accountSummaries ?? []) {
    for (const prop of account.propertySummaries ?? []) {
      // `property` is "properties/123456789" — keep the bare numeric id.
      const propertyId = (prop.property ?? "").split("/").pop() ?? "";
      if (!propertyId) continue;
      out.push({
        propertyId,
        displayName: prop.displayName ?? propertyId,
        account: account.displayName ?? "",
      });
    }
  }
  return out;
}

export type Ga4Report = {
  kpis: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    averageSessionDuration: number;
    newUsers: number;
    /** 0..1 — UI renders as a percentage. */
    engagementRate: number;
  };
  timeseries: { date: string; activeUsers: number; sessions: number }[];
  topPages: { path: string; views: number }[];
  channels: { channel: string; sessions: number }[];
  devices: { device: string; users: number }[];
  /** "source / medium" split apart — answers "how many from Instagram / organic / …". */
  sources: { source: string; sessions: number; users: number }[];
  /** code = ISO 3166-1 alpha-2 (countryId dimension) — drives the flag emoji. */
  countries: { country: string; code: string; users: number }[];
  newVsReturning: { type: string; users: number }[];
};

const num = (v: string | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// "20260916" (GA4 date dimension) → "2026-09-16".
const isoDate = (raw: string) =>
  raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;

type RunReportResp = {
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
};

/**
 * Run every report the dashboard needs and return a narrowed public shape.
 * batchRunReports takes up to 5 requests per call — 8 reports → 2 calls.
 */
export async function runGa4Report(
  accessToken: string,
  propertyId: string,
  range: { startDate: string; endDate: string }
): Promise<Ga4Report> {
  const url = `${DATA_BASE}/properties/${propertyId}:batchRunReports`;
  const dateRanges = [{ startDate: range.startDate, endDate: range.endDate }];

  const kpiMetrics = [
    "activeUsers",
    "sessions",
    "screenPageViews",
    "averageSessionDuration",
    "newUsers",
    "engagementRate",
  ];

  // Request order defines response order — destructured below.
  const requests = [
    { dateRanges, metrics: kpiMetrics.map((name) => ({ name })) },
    {
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    },
    {
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    },
    {
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 6,
    },
    {
      dateRanges,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    },
    {
      dateRanges,
      dimensions: [{ name: "sessionSourceMedium" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 12,
    },
    {
      dateRanges,
      dimensions: [{ name: "country" }, { name: "countryId" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 8,
    },
    {
      dateRanges,
      dimensions: [{ name: "newVsReturning" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    },
  ];

  type BatchResp = { reports?: RunReportResp[] };
  const [batchA, batchB] = await Promise.all([
    ga<BatchResp>(url, accessToken, {
      method: "POST",
      body: JSON.stringify({ requests: requests.slice(0, 5) }),
    }),
    ga<BatchResp>(url, accessToken, {
      method: "POST",
      body: JSON.stringify({ requests: requests.slice(5) }),
    }),
  ]);
  const empty: RunReportResp = {};
  const [totals = empty, series = empty, pages = empty, channels = empty, devices = empty] =
    batchA.reports ?? [];
  const [sources = empty, countries = empty, newVsReturning = empty] =
    batchB.reports ?? [];

  const totalRow = totals.rows?.[0]?.metricValues ?? [];
  return {
    kpis: {
      activeUsers: num(totalRow[0]?.value),
      sessions: num(totalRow[1]?.value),
      screenPageViews: num(totalRow[2]?.value),
      averageSessionDuration: num(totalRow[3]?.value),
      newUsers: num(totalRow[4]?.value),
      engagementRate: num(totalRow[5]?.value),
    },
    timeseries: (series.rows ?? []).map((row) => ({
      date: isoDate(row.dimensionValues?.[0]?.value ?? ""),
      activeUsers: num(row.metricValues?.[0]?.value),
      sessions: num(row.metricValues?.[1]?.value),
    })),
    topPages: (pages.rows ?? []).map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? "",
      views: num(row.metricValues?.[0]?.value),
    })),
    channels: (channels.rows ?? []).map((row) => ({
      channel: row.dimensionValues?.[0]?.value ?? "",
      sessions: num(row.metricValues?.[0]?.value),
    })),
    devices: (devices.rows ?? []).map((row) => ({
      device: row.dimensionValues?.[0]?.value ?? "",
      users: num(row.metricValues?.[0]?.value),
    })),
    sources: (sources.rows ?? []).map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? "",
      sessions: num(row.metricValues?.[0]?.value),
      users: num(row.metricValues?.[1]?.value),
    })),
    countries: (countries.rows ?? []).map((row) => ({
      country: row.dimensionValues?.[0]?.value ?? "",
      code: row.dimensionValues?.[1]?.value ?? "",
      users: num(row.metricValues?.[0]?.value),
    })),
    newVsReturning: (newVsReturning.rows ?? [])
      .map((row) => ({
        type: row.dimensionValues?.[0]?.value ?? "",
        users: num(row.metricValues?.[0]?.value),
      }))
      // GA emits an occasional blank/"(not set)" bucket — noise in a donut.
      .filter((row) => row.type === "new" || row.type === "returning"),
  };
}
