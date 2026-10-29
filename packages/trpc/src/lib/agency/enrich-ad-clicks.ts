import "server-only";

import { and, eq, gte, isNotNull, isNull, lt } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { agencyLead, type AgencyLeadAdClick } from "@workspace/drizzle/schema";

import { isGoogleAdsConfigured, lookupClicks } from "../google-ads";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// click_view data lands a few hours after the click and is kept for 90 days.
const READY_AFTER = 3 * HOUR;
const RETRY_WINDOW = 2 * DAY;
const MAX_DAYS_PER_CALL = 5;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Ties ad leads to the campaign, ad group and keyword that brought them, by
 * looking their gclid up in Google Ads. Runs before lead and ads stats are
 * read; never throws, a failed lookup is retried on a later call.
 */
export async function enrichAdClicks(client: {
  projectId: string;
  googleAdsCustomerId: string | null;
}) {
  const customerId = client.googleAdsCustomerId;
  if (!customerId || !isGoogleAdsConfigured()) return;

  try {
    const now = Date.now();
    const pending = await db
      .select({
        id: agencyLead.id,
        gclid: agencyLead.gclid,
        clickAt: agencyLead.clickAt,
        createdAt: agencyLead.createdAt,
      })
      .from(agencyLead)
      .where(
        and(
          eq(agencyLead.projectId, client.projectId),
          isNotNull(agencyLead.gclid),
          isNull(agencyLead.adClickCheckedAt),
          lt(agencyLead.createdAt, new Date(now - READY_AFTER)),
          gte(agencyLead.createdAt, new Date(now - 89 * DAY))
        )
      )
      .limit(200);
    if (!pending.length) return;

    // The click day is in the account's time zone; try the UTC day and the one before.
    const byDay = new Map<string, typeof pending>();
    for (const lead of pending) {
      const clicked = lead.clickAt ?? lead.createdAt;
      for (const day of [isoDay(clicked), isoDay(new Date(clicked.getTime() - DAY))]) {
        byDay.set(day, [...(byDay.get(day) ?? []), lead]);
      }
    }

    const found = new Map<string, AgencyLeadAdClick>();
    const days = [...byDay.keys()].sort().reverse().slice(0, MAX_DAYS_PER_CALL);
    for (const day of days) {
      const gclids = byDay.get(day)!.map((lead) => lead.gclid!).filter((id) => !found.has(id));
      if (!gclids.length) continue;
      for (const [gclid, click] of await lookupClicks(customerId, day, gclids)) {
        found.set(gclid, click);
      }
    }

    const checkedDays = new Set(days);
    for (const lead of pending) {
      const click = found.get(lead.gclid!);
      const clicked = lead.clickAt ?? lead.createdAt;
      const allDaysChecked = [isoDay(clicked), isoDay(new Date(clicked.getTime() - DAY))].every(
        (day) => checkedDays.has(day)
      );
      // Not found yet on a recent lead: leave it for a later call.
      if (!click && (!allDaysChecked || now - lead.createdAt.getTime() < RETRY_WINDOW)) continue;
      await db
        .update(agencyLead)
        .set({ adClick: click ?? null, adClickCheckedAt: new Date() })
        .where(eq(agencyLead.id, lead.id));
    }
  } catch (error) {
    console.error("Ad click lookup failed", error);
  }
}
