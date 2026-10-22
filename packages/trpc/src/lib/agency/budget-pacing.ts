// Pure budget pacing math. Dates come in so tests control the clock; all
// month boundaries are computed in UTC to match the Ads API's date range.

export type PacingStatus = "on_pace" | "underspending" | "overspending";

export type Pacing = {
  daysInMonth: number;
  /** Days with spend data, today included. */
  daysElapsed: number;
  daysLeft: number;
  /** Straight-line month-end projection from spend so far. */
  projectedCents: number;
  /** projected / target; null without a target. */
  pace: number | null;
  status: PacingStatus | null;
  /** Even daily budget for the rest of the month to land on target. */
  suggestedDailyCents: number | null;
};

// Within 15% of the target counts as on pace.
const ON_PACE_MIN = 0.85;
const ON_PACE_MAX = 1.15;

export function budgetPacing(
  spentCents: number,
  targetCents: number | null,
  now: Date
): Pacing {
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const daysElapsed = now.getUTCDate();
  const daysLeft = daysInMonth - daysElapsed;

  const projectedCents = Math.round((spentCents / daysElapsed) * daysInMonth);
  const pace = targetCents ? projectedCents / targetCents : null;
  const status: PacingStatus | null =
    pace === null
      ? null
      : pace > ON_PACE_MAX
        ? "overspending"
        : pace < ON_PACE_MIN
          ? "underspending"
          : "on_pace";

  return {
    daysInMonth,
    daysElapsed,
    daysLeft,
    projectedCents,
    pace,
    status,
    suggestedDailyCents:
      targetCents && daysLeft > 0
        ? Math.max(0, Math.round((targetCents - spentCents) / daysLeft))
        : null,
  };
}

export const PACING_LABELS: Record<PacingStatus, string> = {
  on_pace: "On pace",
  underspending: "Underspending",
  overspending: "Overspending",
};
