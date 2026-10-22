// Pure date and comparison math for the weekly client report. Weeks are
// Monday to Sunday in UTC, matching the Ads API's date handling.

const DAY = 24 * 60 * 60 * 1000;

const iso = (date: Date) => date.toISOString().slice(0, 10);

export type ReportWeek = {
  /** The last complete Mon-Sun week. */
  from: string;
  to: string;
  /** The week before it. */
  priorFrom: string;
  priorTo: string;
};

/** The last complete Mon-Sun UTC week before `now`, plus the week before it. */
export function reportWeek(now: Date): ReportWeek {
  // Monday of the current week (getUTCDay: Sun 0 .. Sat 6).
  const day = now.getUTCDay();
  const sinceMonday = (day + 6) % 7;
  const thisMonday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  thisMonday.setUTCDate(thisMonday.getUTCDate() - sinceMonday);

  const from = new Date(thisMonday.getTime() - 7 * DAY);
  const to = new Date(thisMonday.getTime() - 1 * DAY);
  return {
    from: iso(from),
    to: iso(to),
    priorFrom: iso(new Date(from.getTime() - 7 * DAY)),
    priorTo: iso(new Date(from.getTime() - 1 * DAY)),
  };
}

export type Delta = {
  /** Percent change vs the prior period; null when the prior was 0. */
  pct: number | null;
  direction: "up" | "down" | "flat";
};

/** Week-over-week change, divide-by-zero safe. */
export function delta(current: number, previous: number): Delta {
  if (current === previous) return { pct: previous ? 0 : null, direction: "flat" };
  if (!previous) return { pct: null, direction: current > previous ? "up" : "down" };
  return {
    pct: Math.round(((current - previous) / previous) * 100),
    direction: current > previous ? "up" : "down",
  };
}

/** "Oct 13 – Oct 19" from the report week, for subjects and headers. */
export function weekLabel(week: ReportWeek): string {
  const fmt = (value: string) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(week.from)} – ${fmt(week.to)}`;
}

export const formatCents = (cents: number, currency = "USD") =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
