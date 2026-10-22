"use client";

import { useMemo, useState, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

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
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { HoverInfo } from "@/components/agency/hover-info";
import {
  formatMoney,
  lastDays,
  RANGES,
  type RangeValue,
} from "@/components/agency/lead-status";
import { useAgency } from "@/components/agency/use-agency";
import { Megaphone } from "@/components/icon";

const ALL = "all";

const formatCustomerId = (id: string) =>
  id.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3");

const titleCase = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

const CHANNEL_LABELS: Record<string, string> = {
  SEARCH: "Search",
  PERFORMANCE_MAX: "Performance Max",
  DISPLAY: "Display",
  VIDEO: "YouTube",
  LOCAL_SERVICES: "Local Services",
  SMART: "Smart",
  DEMAND_GEN: "Demand Gen",
};

function CampaignStatus({ status }: { status: string }) {
  if (!status) return null;
  return (
    <span
      data-status={status}
      className="bg-muted text-muted-foreground data-[status=ENABLED]:bg-chart-2/15 data-[status=ENABLED]:text-chart-2 rounded px-1.5 py-0.5 text-[11px] font-medium"
    >
      {status === "ENABLED" ? "Active" : titleCase(status)}
    </span>
  );
}

const chartConfig = {
  cost: { label: "Ad spend", color: "var(--chart-1)" },
  leads: { label: "Leads", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function StatCard({
  label,
  value,
  hint,
  info,
}: {
  label: string;
  value: string | null;
  hint?: string;
  /** Hover explanation of what the number means and how it's counted. */
  info?: ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-[12px] font-medium tracking-wide uppercase">
          {label}
        </p>
        {info && <HoverInfo title={label} content={info} />}
      </div>
      {value === null ? (
        <Skeleton className="mt-2 h-7 w-16 rounded" />
      ) : (
        <p className="mt-1 text-[24px] font-extrabold tracking-tight">
          {value}
        </p>
      )}
      {hint && (
        <p className="text-muted-foreground mt-0.5 text-[12px]">{hint}</p>
      )}
    </div>
  );
}

/**
 * Leads + Google Ads numbers for a range, shared by Home and Marketing.
 * `campaignId` scopes the ad numbers only: leads aren't tied to a campaign yet,
 * so cost per lead and return on ads are left out for a single campaign.
 */
export function useAgencyNumbers(days: number, campaignId?: string) {
  const trpc = useTRPC();
  const { repoId, adsConnected } = useAgency();
  const range = useMemo(() => lastDays(days), [days]);

  const leads = useQuery(
    trpc.agency.leads.stats.queryOptions(
      { repoId, ...range },
      { placeholderData: keepPreviousData }
    )
  );
  const ads = useQuery(
    trpc.agency.ads.stats.queryOptions(
      { repoId, ...range, campaignId },
      {
        enabled: adsConnected,
        staleTime: 5 * 60 * 1000,
        placeholderData: keepPreviousData,
      }
    )
  );

  const cost = ads.data?.totals.cost ?? null;
  // Ad spend is judged against the leads and deals the ads brought, not all leads.
  const fromAds = leads.data?.byChannel.find(
    (row) => row.channel === "google_ads"
  );
  const adLeads = leads.data ? (fromAds?.leads ?? 0) : null;
  const adWonValueCents = fromAds?.wonValueCents ?? 0;
  const currency = ads.data?.currency ?? "USD";

  return {
    range,
    leads,
    ads,
    currency,
    adLeads,
    adWonValueCents,
    costPerLead:
      !campaignId && cost !== null && adLeads
        ? formatMoney(Math.round((cost / adLeads) * 100), currency)
        : null,
    // Revenue from deals won on ad leads per dollar of ad spend.
    roas:
      !campaignId && cost && leads.data
        ? `${(adWonValueCents / 100 / cost).toFixed(1)}x`
        : null,
  };
}

export function AdsPerformance() {
  const { adsConnected } = useAgency();
  const [days, setDays] = useState<RangeValue>("30");
  const [campaignId, setCampaignId] = useState<string>(ALL);
  const scoped = campaignId === ALL ? undefined : campaignId;
  const { leads, ads, currency, costPerLead, roas, adLeads } = useAgencyNumbers(
    Number(days),
    scoped
  );

  const campaignItems = useMemo(
    () => [
      { value: ALL, label: "All campaigns" },
      ...(ads.data?.campaigns.map((c) => ({ value: c.id, label: c.name })) ??
        []),
    ],
    [ads.data]
  );

  const chartData = useMemo(() => {
    const leadsByDay = new Map(
      leads.data?.byDay.map((d) => [d.date, d.count]) ?? []
    );
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
  const money = (value: number) =>
    formatMoney(Math.round(value * 100), currency);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[14px]">
          {ads.data ? (
            <>
              <span className="text-muted-foreground">Google Ads account </span>
              <span className="font-semibold">
                {ads.data.account.name || "Unnamed"}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {formatCustomerId(ads.data.account.id)} ·{" "}
                {ads.data.campaigns.length}{" "}
                {ads.data.campaigns.length === 1 ? "campaign" : "campaigns"}
              </span>
            </>
          ) : (
            <Skeleton className="h-5 w-64 rounded" />
          )}
        </div>
        <div className="flex gap-2">
          <Select
            items={campaignItems}
            value={campaignId}
            onValueChange={(value) => setCampaignId(String(value))}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {campaignItems.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            items={RANGES}
            value={days}
            onValueChange={(value) => setDays(value as RangeValue)}
          >
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
      </div>

      {ads.error ? (
        <p className="text-destructive text-[14px]">{ads.error.message}</p>
      ) : (
        <div
          className={cn(
            "space-y-6 transition-opacity duration-200",
            (ads.isPlaceholderData || leads.isPlaceholderData) && "opacity-50"
          )}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Ad spend"
              value={totals ? money(totals.cost) : null}
            />
            <StatCard
              label="Clicks"
              value={totals ? totals.clicks.toLocaleString() : null}
            />
            <StatCard
              label="Ad leads"
              value={adLeads === null ? null : String(adLeads)}
              hint={
                scoped
                  ? "All campaigns"
                  : leads.data
                    ? `${leads.data.leads} leads from all sources`
                    : undefined
              }
            />
            <StatCard
              label="Cost per ad lead"
              value={
                ads.isLoading || leads.isLoading ? null : (costPerLead ?? "–")
              }
              hint={scoped ? "All campaigns only" : undefined}
            />
            <StatCard
              label="Won from ads"
              value={
                leads.data
                  ? String(
                      leads.data.byChannel.find(
                        (row) => row.channel === "google_ads"
                      )?.won ?? 0
                    )
                  : null
              }
              hint={scoped ? "All campaigns" : undefined}
            />
            <StatCard
              label="Return on ads"
              value={ads.isLoading || leads.isLoading ? null : (roas ?? "–")}
              hint={scoped ? "All campaigns only" : undefined}
            />
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
                    tickFormatter={(value: string) =>
                      format(parseISO(value), "MMM d")
                    }
                  />
                  <YAxis yAxisId="cost" hide />
                  <YAxis
                    yAxisId="leads"
                    orientation="right"
                    hide
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    yAxisId="cost"
                    dataKey="cost"
                    fill="var(--color-cost)"
                    radius={4}
                  />
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
                  <TableRow
                    key={campaign.id}
                    data-selected={campaign.id === campaignId || undefined}
                    className="data-[selected]:bg-muted cursor-pointer"
                    onClick={() =>
                      setCampaignId(
                        campaign.id === campaignId ? ALL : campaign.id
                      )
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{campaign.name}</span>
                        <CampaignStatus status={campaign.status} />
                      </div>
                      {campaign.channel && (
                        <p className="text-muted-foreground text-[12px]">
                          {CHANNEL_LABELS[campaign.channel] ??
                            titleCase(campaign.channel)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(campaign.cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.clicks.toLocaleString()}
                    </TableCell>
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
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No campaigns in this Google Ads account yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
