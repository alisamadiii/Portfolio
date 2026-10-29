import "server-only";

import { and, count, eq, gte, isNotNull, or, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { agencyClient, agencyLead } from "@workspace/drizzle/schema";

import {
  getAlertSignals,
  getBudgetPacing,
  getConversionActions,
  isGoogleAdsConfigured,
} from "../google-ads";
import { ADS_TTL, cachedAds } from "./ads-cache";
import { evaluateAlerts, type AdsAlert } from "./ads-alerts";
import { budgetPacing } from "./budget-pacing";
import { trackingStatus, type WiredActions } from "./conversion-presets";

type Client = typeof agencyClient.$inferSelect;

/** Conversion actions the Hub reports to, by stage (won lives in its own column). */
export const wiredActions = (client: Client): WiredActions => ({
  ...client.googleAdsActions,
  won: client.googleAdsConversionAction ?? undefined,
});

/**
 * Health checks across budget, conversions, ads and uploads, cached 15 min
 * under "alerts". Shared by the hub's alert banner and the weekly report
 * email so they always agree. Null without a linked account; [] on failure
 * (alerts are a bonus, never worth breaking a page or an email over).
 */
export async function getAccountAlerts(client: Client): Promise<AdsAlert[] | null> {
  const customerId = client.googleAdsCustomerId;
  if (!customerId || !isGoogleAdsConfigured()) return null;
  try {
    return await cachedAds(customerId, "alerts", ADS_TTL.live, async () => {
      const today = new Date().toISOString().slice(0, 10);
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const failureStage = (stage: string) =>
        sql`(${agencyLead.adsUploads} -> ${stage} ->> 'error') is not null or (${agencyLead.adsUploads} -> ${stage} ->> 'verifyError') is not null`;

      const [pacingData, signals, actions, [failures]] = await Promise.all([
        getBudgetPacing(customerId),
        getAlertSignals(customerId),
        getConversionActions(customerId, monthAgo, today),
        db
          .select({ count: count() })
          .from(agencyLead)
          .where(
            and(
              eq(agencyLead.projectId, client.projectId!),
              gte(
                agencyLead.createdAt,
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              ),
              or(
                isNotNull(agencyLead.conversionError),
                ...["lead", "qualified", "won"].map(failureStage)
              )
            )
          ),
      ]);

      const trackingBroken = Object.values(wiredActions(client))
        .filter(Boolean)
        .flatMap((resourceName) => {
          const action = actions.find((a) => a.resourceName === resourceName);
          if (!action) return [];
          const status = trackingStatus(action);
          return status === "inactive" || status === "no_recent"
            ? [{ name: action.name, status }]
            : [];
        });

      const targetCents = client.googleAdsBudget?.monthlyCents ?? null;
      return evaluateAlerts({
        pacing: targetCents
          ? budgetPacing(pacingData.spentCents, targetCents, new Date())
          : null,
        targetCents,
        conversionsLast7: signals.conversionsLast7,
        conversionsPrior7: signals.conversionsPrior7,
        disapprovedAds: signals.disapprovedAds,
        budgetLimited: pacingData.campaigns
          .filter((campaign) => campaign.status === "ENABLED")
          .map((campaign) => ({
            name: campaign.name,
            share: campaign.budgetLostShare,
          })),
        trackingBroken,
        uploadFailures: failures?.count ?? 0,
        geoInterest: signals.geoInterest,
        rankLost: signals.rankLost,
        searchCampaignsWithoutNegatives: signals.searchCampaignsWithoutNegatives,
        autoApplyEnabled: signals.autoApplyEnabled,
      });
    });
  } catch (error) {
    console.error("Ads alerts failed", error);
    return [];
  }
}
