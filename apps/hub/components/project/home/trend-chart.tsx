"use client";

import { useId } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Area, AreaChart, XAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";

export type TrendSeries = { key: string; label: string; color: string };
export type TrendPoint = { date: string } & Record<string, number | string>;

/** The last `days` calendar days as YYYY-MM-DD, oldest first. */
export const lastDates = (days: number, now = new Date()) =>
  Array.from({ length: days }, (_, i) => format(subDays(now, days - 1 - i), "yyyy-MM-dd"));

/** Every YYYY-MM-DD from `from` to `to` inclusive (both store-local dates). */
export const datesBetween = (from: string, to: string) => {
  const out: string[] = [];
  const cursor = parseISO(from);
  const end = parseISO(to);
  while (cursor <= end && out.length < 400) {
    out.push(format(cursor, "yyyy-MM-dd"));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
};

/** Zero-fill a sparse per-day series so the chart shows every day of the range. */
export function fillDays<K extends string>(
  days: number | { from: string; to: string },
  rows: ({ date: string } & Partial<Record<K, number>>)[],
  keys: readonly K[]
): TrendPoint[] {
  const byDate = new Map(rows.map((r) => [r.date.slice(0, 10), r]));
  const dates = typeof days === "number" ? lastDates(days) : datesBetween(days.from, days.to);
  return dates.map((date) => {
    const row = byDate.get(date);
    const point: TrendPoint = { date };
    for (const k of keys) point[k] = Number(row?.[k] ?? 0);
    return point;
  });
}

/**
 * Area chart over days. One series: no legend (the section title names it).
 * Two or more: legend + direct colors. Values stay in ink; color only on marks.
 */
export function TrendChart({
  data,
  series,
  height = 200,
}: {
  data: TrendPoint[];
  series: readonly TrendSeries[];
  height?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }])) satisfies ChartConfig;
  const long = data.length > 31;
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <AreaChart data={data} margin={{ left: 4, right: 4, top: 4 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${s.key})`} stopOpacity={0.45} />
              <stop offset="95%" stopColor={`var(--color-${s.key})`} stopOpacity={0.04} />
            </linearGradient>
          ))}
        </defs>
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={long ? 28 : 12}
          tickFormatter={(value: string) => (value ? format(parseISO(value), "MMM d") : "")}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--color-line-strong, #d8d2cb)", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                typeof value === "string" && value ? format(parseISO(value), "EEE, MMM d") : ""
              }
            />
          }
        />
        {series.map((s) => (
          <Area
            key={s.key}
            dataKey={s.key}
            type="monotone"
            fill={`url(#${uid}-${s.key})`}
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-surface, #fff)" }}
            isAnimationActive={false}
          />
        ))}
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
      </AreaChart>
    </ChartContainer>
  );
}
