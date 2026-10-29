import "server-only";

import { and, count, eq, gte, isNull, lt, ne, sql, sum } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { agencyClient, agencyLead } from "@workspace/drizzle/schema";

import {
  getAdsStats,
  getSearchTerms,
  isGoogleAdsConfigured,
} from "../google-ads";
import { getAccountAlerts } from "./account-alerts";
import { cachedAds, ttlForRange } from "./ads-cache";
import { reportWeek, weekLabel, type ReportWeek } from "./report-math";

type Client = typeof agencyClient.$inferSelect;

type Compared = { current: number; previous: number };

export type WeeklyReportData = {
  week: ReportWeek;
  label: string;
  currency: string;
  leads: Compared;
  adLeads: Compared;
  won: Compared;
  wonValueCents: Compared;
  bookings: Compared;
  /** Null when no Google Ads account is linked. */
  spendCents: Compared | null;
  costPerLeadCents: { current: number | null; previous: number | null } | null;
  costPerBookingCents: { current: number | null; previous: number | null } | null;
  topCampaign: { name: string; spendCents: number; leads: number } | null;
  topSearchTerm: { term: string; costCents: number } | null;
  /** Alert titles, worst first. */
  alerts: string[];
};

const bounds = (from: string, to: string) => {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

async function leadNumbers(projectId: string, from: string, to: string) {
  const { start, end } = bounds(from, to);
  const [row] = await db
    .select({
      leads: count(),
      adLeads: sql<number>`count(*) filter (where ${agencyLead.channel} = 'google_ads')`.mapWith(Number),
    })
    .from(agencyLead)
    .where(
      and(
        eq(agencyLead.projectId, projectId),
        ne(agencyLead.status, "spam"),
        gte(agencyLead.createdAt, start),
        lt(agencyLead.createdAt, end)
      )
    );
  // Won counts by when the deal closed, like the dashboard.
  const [won] = await db
    .select({ count: count(), valueCents: sum(agencyLead.valueCents) })
    .from(agencyLead)
    .where(
      and(
        eq(agencyLead.projectId, projectId),
        eq(agencyLead.status, "won"),
        gte(agencyLead.wonAt, start),
        lt(agencyLead.wonAt, end)
      )
    );
  // Bookings count by meeting time; canceled ones drop out.
  const [bookings] = await db
    .select({
      count: count(),
      fromAds: sql<number>`count(*) filter (where ${agencyLead.channel} = 'google_ads')`.mapWith(Number),
    })
    .from(agencyLead)
    .where(
      and(
        eq(agencyLead.projectId, projectId),
        eq(agencyLead.source, "booking"),
        isNull(agencyLead.bookingCanceledAt),
        gte(agencyLead.bookingAt, start),
        lt(agencyLead.bookingAt, end)
      )
    );
  return {
    leads: row?.leads ?? 0,
    adLeads: row?.adLeads ?? 0,
    won: won?.count ?? 0,
    wonValueCents: Number(won?.valueCents ?? 0),
    bookings: bookings?.count ?? 0,
    adBookings: bookings?.fromAds ?? 0,
  };
}

/** Everything the weekly email shows, as one serializable object. */
export async function buildWeeklyReport(
  client: Client,
  now = new Date()
): Promise<WeeklyReportData> {
  const week = reportWeek(now);
  const projectId = client.projectId!;
  const customerId = client.googleAdsCustomerId;
  const hasAds = Boolean(customerId && isGoogleAdsConfigured());

  const [current, previous, adsCurrent, adsPrevious, terms, alerts] =
    await Promise.all([
      leadNumbers(projectId, week.from, week.to),
      leadNumbers(projectId, week.priorFrom, week.priorTo),
      hasAds
        ? cachedAds(customerId!, `stats:${week.from}:${week.to}:all`, ttlForRange(week.to), () =>
            getAdsStats(customerId!, week.from, week.to)
          ).catch(() => null)
        : null,
      hasAds
        ? cachedAds(customerId!, `stats:${week.priorFrom}:${week.priorTo}:all`, ttlForRange(week.priorTo), () =>
            getAdsStats(customerId!, week.priorFrom, week.priorTo)
          ).catch(() => null)
        : null,
      hasAds
        ? cachedAds(customerId!, `searchTerms:${week.from}:${week.to}:all`, ttlForRange(week.to), () =>
            getSearchTerms(customerId!, week.from, week.to)
          ).catch(() => [])
        : [],
      getAccountAlerts(client),
    ]);

  const spend = (stats: typeof adsCurrent) =>
    Math.round((stats?.totals.cost ?? 0) * 100);
  const cpl = (spendCents: number, adLeads: number) =>
    adLeads > 0 && spendCents > 0 ? Math.round(spendCents / adLeads) : null;

  const top = adsCurrent?.campaigns
    .filter((campaign) => campaign.cost > 0)
    .sort((a, b) => b.cost - a.cost)[0];
  let topCampaign: WeeklyReportData["topCampaign"] = null;
  if (top) {
    const { start, end } = bounds(week.from, week.to);
    const [row] = await db
      .select({ count: count() })
      .from(agencyLead)
      .where(
        and(
          eq(agencyLead.projectId, projectId),
          ne(agencyLead.status, "spam"),
          sql`${agencyLead.adClick}->>'campaignId' = ${top.id}`,
          gte(agencyLead.createdAt, start),
          lt(agencyLead.createdAt, end)
        )
      );
    topCampaign = {
      name: top.name,
      spendCents: Math.round(top.cost * 100),
      leads: row?.count ?? 0,
    };
  }

  const topTerm = terms.find((term) => term.costCents > 0);

  return {
    week,
    label: weekLabel(week),
    currency: adsCurrent?.currency ?? "USD",
    leads: { current: current.leads, previous: previous.leads },
    adLeads: { current: current.adLeads, previous: previous.adLeads },
    won: { current: current.won, previous: previous.won },
    wonValueCents: {
      current: current.wonValueCents,
      previous: previous.wonValueCents,
    },
    bookings: { current: current.bookings, previous: previous.bookings },
    spendCents: hasAds
      ? { current: spend(adsCurrent), previous: spend(adsPrevious) }
      : null,
    costPerLeadCents: hasAds
      ? {
          current: cpl(spend(adsCurrent), current.adLeads),
          previous: cpl(spend(adsPrevious), previous.adLeads),
        }
      : null,
    costPerBookingCents: hasAds
      ? {
          current: cpl(spend(adsCurrent), current.adBookings),
          previous: cpl(spend(adsPrevious), previous.adBookings),
        }
      : null,
    topCampaign,
    topSearchTerm: topTerm
      ? { term: topTerm.term, costCents: topTerm.costCents }
      : null,
    alerts: (alerts ?? []).map((alert) => alert.title),
  };
}
