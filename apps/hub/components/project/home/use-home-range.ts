"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

import { lastDays } from "@/components/agency/lead-status";

// One window for every dashboard section (Home and Orders). Lives in the URL
// so a range survives reloads and can be shared.
export const HOME_RANGES = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "28d", label: "Last 28 days", days: 28 },
  { value: "90d", label: "Last 90 days", days: 90 },
] as const;
export type HomeRange = (typeof HOME_RANGES)[number]["value"];
export type RangeDays = (typeof HOME_RANGES)[number]["days"];

const values = HOME_RANGES.map((r) => r.value) as [HomeRange, ...HomeRange[]];

export function useHomeRange() {
  const [range, setRange] = useQueryState("range", parseAsStringLiteral(values).withDefault("7d"));
  const days = (HOME_RANGES.find((r) => r.value === range)?.days ?? 7) as RangeDays;
  return {
    range,
    setRange: (next: HomeRange) => void setRange(next === "7d" ? null : next),
    days,
    /** Inclusive YYYY-MM-DD bounds for agency.leads.stats. */
    leadsRange: lastDays(days),
  };
}
