// Pure alert rules for an ads account. Data gathering lives in the router;
// this only decides what deserves attention, so it's directly testable.

import type { Pacing } from "./budget-pacing";

export type AdsAlert = {
  id: string;
  severity: "critical" | "warning";
  title: string;
  detail: string;
  /** Hub page that fixes or explains it. */
  href: string;
};

export type AlertSignals = {
  pacing: Pacing | null;
  targetCents: number | null;
  conversionsLast7: number;
  conversionsPrior7: number;
  disapprovedAds: number;
  /** Enabled campaigns losing search impression share to budget (0..1). */
  budgetLimited: { name: string; share: number }[];
  /** Wired conversion actions that stopped recording. */
  trackingBroken: { name: string; status: string }[];
  /** Leads whose conversion upload failed in the last 7 days. */
  uploadFailures: number;
};

// Small accounts stay quiet: a 3 → 1 conversions week isn't a drop signal.
const MIN_PRIOR_CONVERSIONS = 5;
const DROP_RATIO = 0.5;
const BUDGET_LIMITED_SHARE = 0.2;
// Underspend only alarms once the month is far enough along to mean something.
const UNDERSPEND_FROM_DAY = 10;

export function evaluateAlerts(signals: AlertSignals): AdsAlert[] {
  const alerts: AdsAlert[] = [];
  const { pacing } = signals;

  if (pacing?.status === "overspending") {
    alerts.push({
      id: "overspend",
      severity: "critical",
      title: "Spending over budget",
      detail: `On track to spend ${Math.round((pacing.pace ?? 0) * 100)}% of the monthly budget.`,
      href: "/marketing/budget",
    });
  }
  if (
    pacing?.status === "underspending" &&
    pacing.daysElapsed >= UNDERSPEND_FROM_DAY
  ) {
    alerts.push({
      id: "underspend",
      severity: "warning",
      title: "Spending under budget",
      detail: `On track to spend only ${Math.round((pacing.pace ?? 0) * 100)}% of the monthly budget.`,
      href: "/marketing/budget",
    });
  }

  if (
    signals.conversionsPrior7 >= MIN_PRIOR_CONVERSIONS &&
    signals.conversionsLast7 < signals.conversionsPrior7 * DROP_RATIO
  ) {
    alerts.push({
      id: "conversions-drop",
      severity: "critical",
      title: "Conversions dropped",
      detail: `${signals.conversionsLast7} in the last 7 days, down from ${signals.conversionsPrior7} the week before.`,
      href: "/marketing/conversions",
    });
  }

  if (signals.disapprovedAds > 0) {
    alerts.push({
      id: "disapproved-ads",
      severity: "critical",
      title: `${signals.disapprovedAds} disapproved ${signals.disapprovedAds === 1 ? "ad" : "ads"}`,
      detail: "Disapproved ads don't run. Review them in Google Ads.",
      href: "/marketing",
    });
  }

  const limited = signals.budgetLimited.filter(
    (campaign) => campaign.share > BUDGET_LIMITED_SHARE
  );
  if (limited.length) {
    alerts.push({
      id: "budget-limited",
      severity: "warning",
      title: `${limited.length} ${limited.length === 1 ? "campaign" : "campaigns"} limited by budget`,
      detail: `${limited[0]!.name} is missing ${Math.round(limited[0]!.share * 100)}% of possible impressions because the budget runs out.`,
      href: "/marketing/budget",
    });
  }

  for (const action of signals.trackingBroken) {
    alerts.push({
      id: `tracking:${action.name}`,
      severity: "warning",
      title: `${action.name} stopped recording`,
      detail:
        action.status === "inactive"
          ? "The conversion action is paused or removed."
          : "No conversions recorded in the last 7 days.",
      href: "/marketing/conversions",
    });
  }

  if (signals.uploadFailures > 0) {
    alerts.push({
      id: "upload-failures",
      severity: "warning",
      title: `${signals.uploadFailures} conversion ${signals.uploadFailures === 1 ? "upload" : "uploads"} failing`,
      detail: "Some leads couldn't be reported to Google Ads in the last 7 days.",
      href: "/marketing/conversions",
    });
  }

  // Critical first, stable within severity.
  return alerts.sort(
    (a, b) => Number(b.severity === "critical") - Number(a.severity === "critical")
  );
}
