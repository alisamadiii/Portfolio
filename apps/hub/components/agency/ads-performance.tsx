"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { useTRPC } from "@workspace/trpc/client";

import { useAgency } from "@/components/agency/agency-context";
import {
  formatMoney,
  lastDays,
  RANGES,
  type RangeValue,
} from "@/components/agency/lead-status";
import { Megaphone } from "@/components/icon";

const chartConfig = {
  cost: { label: "Ad spend", color: "var(--chart-1)" },
  leads: { label: "Leads", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function StatCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-[12px] font-medium tracking-wide uppercase">
        {label}
      </p>
      {value === null ? (
        <Skeleton className="mt-2 h-7 w-16 rounded" />
      ) : (
        <p className="mt-1 text-[24px] font-extrabold tracking-tight">{value}</p>
      )}
    </div>
  );
}

/** Leads + Google Ads numbers for a range, shared by Home and Marketing. */
export function useAgencyNumbers(days: number) {
  const trpc = useTRPC();
  const { repoId, adsConnected } = useAgency();
  const range = useMemo(() => lastDays(days), [days]);

  const leads = useQuery(trpc.agency.leads.stats.queryOptions({ repoId, ...range }));
  const ads = useQuery(
    trpc.agency.ads.stats.queryOptions(
      { repoId, ...range },
      { enabled: adsConnected, staleTime: 5 * 60 * 1000 }
    )
  );

  const cost = ads.data?.totals.cost ?? null;
  const leadCount = leads.data?.leads ?? null;
  const currency = ads.data?.currency ?? "USD";

  return {
    range,
    leads,
    ads,
    currency,
    costPerLead:
      cost !== null && leadCount ? formatMoney(Math.round((cost / leadCount) * 100), currency) : null,
    // Revenue from won deals per dollar of ad spend.
    roas:
      cost && leads.data ? `${(leads.data.wonValueCents / 100 / cost).toFixed(1)}x` : null,
  };
}

export function AdsPerformance() {
  const { adsConnected } = useAgency();
  const [days, setDays] = useState<RangeValue>("30");
  const { leads, ads, currency, costPerLead, roas } = useAgencyNumbers(Number(days));

  const chartData = useMemo(() => {
    const leadsByDay = new Map(leads.data?.byDay.map((d) => [d.date, d.count]) ?? []);
    return (ads.data?.days ?? []).map((day) => ({
      date: day.date,
      cost: Math.round(day.cost),
      leads: leadsByDay.get(day.date) ?? 0,
    }));
  }, [ads.data, leads.data]);

  // Null from the server: no account linked, or the Ads API isn't set up yet.
  if (!adsConnected || (ads.isSuccess && !ads.data)) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-14 text-center">
        <Megaphone className="text-muted-foreground mx-auto size-8" />
        <h3 className="mt-3 text-[18px] font-extrabold tracking-tight">
          Your ads aren&apos;t connected yet
        </h3>
        <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[14px]">
          Once your Google Ads campaigns are live, spend, clicks and cost per
          lead show up here.
        </p>
      </div>
    );
  }

  const totals = ads.data?.totals;
  const money = (value: number) => formatMoney(Math.round(value * 100), currency);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={days} onValueChange={(value) => setDays(value as RangeValue)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ads.error ? (
        <p className="text-destructive text-[14px]">{ads.error.message}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Ad spend" value={totals ? money(totals.cost) : null} />
            <StatCard label="Clicks" value={totals ? totals.clicks.toLocaleString() : null} />
            <StatCard
              label="Leads"
              value={leads.data ? String(leads.data.leads) : null}
            />
            <StatCard label="Cost per lead" value={ads.isLoading || leads.isLoading ? null : (costPerLead ?? "–")} />
            <StatCard label="Won deals" value={leads.data ? String(leads.data.won) : null} />
            <StatCard label="Return on ads" value={ads.isLoading || leads.isLoading ? null : (roas ?? "–")} />
          </div>

          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground mb-3 text-[12px] font-medium tracking-wide uppercase">
              Spend vs leads
            </p>
            {ads.isLoading ? (
              <Skeleton className="h-[280px] w-full rounded" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <ComposedChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    tickFormatter={(value: string) => format(parseISO(value), "MMM d")}
                  />
                  <YAxis yAxisId="cost" hide />
                  <YAxis yAxisId="leads" orientation="right" hide allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="cost" dataKey="cost" fill="var(--color-cost)" radius={4} />
                  <Line
                    yAxisId="leads"
                    dataKey="leads"
                    type="monotone"
                    stroke="var(--color-leads)"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ChartContainer>
            )}
          </div>

          <div className="bg-card overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.data?.campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell className="text-right">{money(campaign.cost)}</TableCell>
                    <TableCell className="text-right">{campaign.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {campaign.impressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.round(campaign.conversions).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {ads.data && !ads.data.campaigns.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      No campaign activity in this range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
