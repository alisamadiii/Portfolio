"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@workspace/ui/components/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
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

import {
  formatMoney,
  lastDays,
  RANGES,
  type RangeValue,
  StatusPill,
} from "@/components/agency/lead-status";
import { AdsAlerts } from "@/components/agency/ads-alerts";
import { MarketingTabs } from "@/components/agency/marketing-tabs";
import {
  PageShell,
  StatCardRow,
  TableCard,
} from "@/components/agency/page-shell";
import { useCampaignFilter } from "@/components/agency/campaign-filter";
import { useAgency } from "@/components/agency/use-agency";
import { CampaignUrlDialog } from "@/components/agency/campaign-url-dialog";
import { EllipsisVertical, Megaphone } from "@/components/icon";

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

const copy = (label: string, value: string) =>
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied.`))
    .catch(() => toast.error("Couldn't copy."));

/** Row menu: copy the campaign's id and details for use elsewhere. */
function CampaignMenu({
  campaign,
  currency,
}: {
  campaign: {
    id: string;
    name: string;
    status: string;
    channel: string;
    cost: number;
    clicks: number;
    impressions: number;
    conversions: number;
  };
  currency: string;
}) {
  const details = [
    `Campaign: ${campaign.name}`,
    `ID: ${campaign.id}`,
    `Status: ${campaign.status}`,
    `Type: ${CHANNEL_LABELS[campaign.channel] ?? titleCase(campaign.channel || "UNKNOWN")}`,
    `Spend: ${formatMoney(Math.round(campaign.cost * 100), currency)}`,
    `Clicks: ${campaign.clicks}`,
    `Impressions: ${campaign.impressions}`,
    `Conversions: ${Math.round(campaign.conversions)}`,
  ].join("\n");
  const [buildingUrl, setBuildingUrl] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${campaign.name} menu`}
            className="text-muted-foreground"
            onClick={(event) => event.stopPropagation()}
          >
            <EllipsisVertical className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="w-52"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem onClick={() => copy("Campaign ID", campaign.id)}>
          Copy campaign ID
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copy("Campaign name", campaign.name)}>
          Copy name
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copy("Campaign details", details)}>
          Copy all details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setBuildingUrl(true)}>
          Build tracking link…
        </DropdownMenuItem>
      </DropdownMenuContent>
      {buildingUrl && (
        <CampaignUrlDialog
          open
          onOpenChange={(open) => !open && setBuildingUrl(false)}
          campaign={campaign}
        />
      )}
    </DropdownMenu>
  );
}

function CampaignStatus({ status }: { status: string }) {
  if (!status) return null;
  return (
    <StatusPill tone={status === "ENABLED" ? "success" : "neutral"} dot={false}>
      {status === "ENABLED" ? "Active" : titleCase(status)}
    </StatusPill>
  );
}

const chartConfig = {
  cost: { label: "Ad spend", color: "var(--chart-1)" },
  leads: { label: "Leads", color: "var(--chart-3)" },
} satisfies ChartConfig;

/**
 * Leads + Google Ads numbers for a range, shared by Home and Marketing.
 * The sidebar campaign filter scopes both sides, so cost per lead and return
 * on ads stay comparable for a single campaign too.
 */
export function useAgencyNumbers(days: number) {
  const trpc = useTRPC();
  const { projectId, adsConnected } = useAgency();
  const { campaignId } = useCampaignFilter();
  const range = useMemo(() => lastDays(days), [days]);
  const scope = campaignId ?? undefined;

  const leads = useQuery(
    trpc.agency.leads.stats.queryOptions(
      { projectId, ...range, campaignId: scope },
      { placeholderData: keepPreviousData }
    )
  );
  const ads = useQuery(
    trpc.agency.ads.stats.queryOptions(
      { projectId, ...range, campaignId: scope },
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
  const perAdCount = (count: number | undefined) =>
    cost !== null && count
      ? formatMoney(Math.round((cost / count) * 100), currency)
      : null;

  return {
    range,
    leads,
    ads,
    currency,
    adLeads,
    adWonValueCents,
    costPerLead:
      cost !== null && adLeads
        ? formatMoney(Math.round((cost / adLeads) * 100), currency)
        : null,
    costPerBooking: perAdCount(leads.data?.bookings.fromAds),
    costPerQualified: perAdCount(leads.data?.adQualified),
    // Revenue from deals won on ad leads per dollar of ad spend.
    roas:
      cost && leads.data
        ? `${(adWonValueCents / 100 / cost).toFixed(1)}x`
        : null,
  };
}

export function AdsPerformance() {
  const { adsConnected } = useAgency();
  const [days, setDays] = useState<RangeValue>("30");
  // Set from the sidebar; scopes leads and ad numbers together.
  const { campaignId, setCampaignId } = useCampaignFilter();
  const {
    leads,
    ads,
    currency,
    costPerLead,
    costPerBooking,
    costPerQualified,
    roas,
    adLeads,
  } = useAgencyNumbers(Number(days));

  const chartData = useMemo(() => {
    const leadsByDay = new Map(
      leads.data?.byDay.map((d) => [d.date, d.count]) ?? []
    );
    return (ads.data?.days ?? []).map((day) => ({
      date: day.date,
      cost: day.cost,
      leads: leadsByDay.get(day.date) ?? 0,
    }));
  }, [ads.data, leads.data]);

  const money = (value: number) =>
    formatMoney(Math.round(value * 100), currency);

  const controls = (
    <>
      {ads.data && (
        <span className="ring-foreground/10 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[14px] ring-1">
          <span className="size-2 rounded-full bg-[#2f6b3f]" />
          <span className="font-medium">
            {ads.data.account.name || "Unnamed"}
          </span>
          <span className="text-muted-foreground font-mono text-[12px]">
            {formatCustomerId(ads.data.account.id)}
          </span>
        </span>
      )}
      <Select
        items={RANGES}
        value={days}
        onValueChange={(value) => setDays(value as RangeValue)}
      >
        <SelectTrigger size="lg" className="w-40">
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
    </>
  );

  // Null from the server: no account linked, or the Ads API isn't set up yet.
  const notConnected = !adsConnected || (ads.isSuccess && !ads.data);
  const totals = ads.data?.totals;

  return (
    <PageShell
      eyebrow="MARKETING · GOOGLE ADS"
      title="Overview"
      lead="What your Google Ads cost, and what they brought in."
      controls={notConnected ? undefined : controls}
      tabs={<MarketingTabs />}
    >
      {notConnected ? (
        <div className="ring-foreground/10 rounded-[18px] px-6 py-14 text-center ring-1 ring-dashed">
          <Megaphone className="text-muted-foreground mx-auto size-8" />
          <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.02em]">
            Your ads aren&apos;t connected yet
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[15px]">
            Once your Google Ads campaigns are live, spend, clicks and cost per
            lead show up here.
          </p>
        </div>
      ) : ads.error ? (
        <p className="text-destructive text-[15px]">{ads.error.message}</p>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-6 transition-opacity duration-200",
            (ads.isPlaceholderData || leads.isPlaceholderData) && "opacity-50"
          )}
        >
          <AdsAlerts />
          <StatCardRow
            cells={[
              { label: "Ad spend", value: totals ? money(totals.cost) : null },
              {
                label: "Clicks",
                value: totals ? totals.clicks.toLocaleString() : null,
              },
              {
                label: "Ad leads",
                value: adLeads === null ? null : String(adLeads),
                sub: leads.data
                  ? `${leads.data.leads} from all sources`
                  : undefined,
              },
              {
                label: "Cost per ad lead",
                value:
                  ads.isLoading || leads.isLoading ? null : (costPerLead ?? "–"),
              },
              {
                label: "Won from ads",
                value: leads.data
                  ? String(
                      leads.data.byChannel.find(
                        (row) => row.channel === "google_ads"
                      )?.won ?? 0
                    )
                  : null,
              },
              {
                label: "Return on ads",
                value: ads.isLoading || leads.isLoading ? null : (roas ?? "–"),
              },
            ]}
          />

          <StatCardRow
            cells={[
              {
                label: "Cost per booking",
                value:
                  ads.isLoading || leads.isLoading
                    ? null
                    : (costPerBooking ?? "–"),
                sub: leads.data
                  ? `${leads.data.bookings.fromAds} booked from ads · ${leads.data.bookings.total} total`
                  : undefined,
              },
              {
                label: "Cost per qualified lead",
                value:
                  ads.isLoading || leads.isLoading
                    ? null
                    : (costPerQualified ?? "–"),
                sub: leads.data
                  ? `${leads.data.adQualified} qualified or won from ads`
                  : undefined,
              },
              {
                label: "No-show rate",
                value: leads.data
                  ? leads.data.bookings.total > 0
                    ? `${Math.round((leads.data.bookings.noShows / leads.data.bookings.total) * 100)}%`
                    : "–"
                  : null,
                sub: leads.data?.bookings.noShows
                  ? `${leads.data.bookings.noShows} no-shows`
                  : undefined,
              },
            ]}
          />

          <div className="bg-card ring-foreground/7 rounded-[18px] p-6 shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                Spend vs leads, by day
              </p>
              <div className="flex items-center gap-4 text-[13px]">
                <span className="flex items-center gap-1.5">
                  <span className="bg-primary size-2.5 rounded-[3px]" /> Ad spend
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="bg-foreground size-2.5 rounded-full" /> Leads
                </span>
              </div>
            </div>
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
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => (
                          <>
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="flex flex-1 items-center justify-between gap-2 leading-none">
                              <span className="text-muted-foreground">
                                {chartConfig[name as keyof typeof chartConfig]
                                  ?.label ?? name}
                              </span>
                              <span className="text-foreground font-mono font-medium tabular-nums">
                                {name === "cost"
                                  ? money(Number(value))
                                  : Number(value).toLocaleString()}
                              </span>
                            </div>
                          </>
                        )}
                      />
                    }
                  />
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

          <TableCard>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                  <TableHead className="pl-6">Campaign</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.data?.campaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    data-selected={campaign.id === campaignId || undefined}
                    className="cursor-pointer text-[15px] data-[selected]:bg-foreground/4"
                    onClick={() =>
                      setCampaignId(
                        campaign.id === campaignId ? null : campaign.id
                      )
                    }
                  >
                    <TableCell className="py-[18px] pl-6">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{campaign.name}</span>
                        <CampaignStatus status={campaign.status} />
                      </div>
                      {campaign.channel && (
                        <p className="text-muted-foreground text-[13px]">
                          {CHANNEL_LABELS[campaign.channel] ??
                            titleCase(campaign.channel)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(campaign.cost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {campaign.clicks.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {campaign.impressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Math.round(campaign.conversions).toLocaleString()}
                    </TableCell>
                    <TableCell
                      className="pr-4 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <CampaignMenu campaign={campaign} currency={currency} />
                    </TableCell>
                  </TableRow>
                ))}
                {ads.data && !ads.data.campaigns.length && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No campaigns in this Google Ads account yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableCard>

          <LeadsByCampaign
            byCampaign={leads.data?.byCampaign ?? []}
            campaigns={ads.data?.campaigns ?? []}
            currency={currency}
          />

          {(leads.data?.landingPages.length ?? 0) > 0 && (
            <TableCard>
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                    <TableHead className="pl-6">Landing page</TableHead>
                    <TableHead className="pr-6 text-right">Leads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.data?.landingPages.map((row) => (
                    <TableRow key={row.page} className="text-[15px]">
                      <TableCell className="max-w-[420px] truncate py-[14px] pl-6 font-medium">
                        {row.page}
                      </TableCell>
                      <TableCell className="pr-6 text-right tabular-nums">
                        {row.leads.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
          )}
        </div>
      )}
    </PageShell>
  );
}

/** Captured leads joined with spend per campaign: the numbers owners care about. */
function LeadsByCampaign({
  byCampaign,
  campaigns,
  currency,
}: {
  byCampaign: {
    campaignId: string;
    campaignName: string;
    leads: number;
    won: number;
    wonValueCents: number;
  }[];
  campaigns: { id: string; cost: number }[];
  currency: string;
}) {
  if (!byCampaign.length) return null;
  const spendById = new Map(campaigns.map((campaign) => [campaign.id, campaign.cost]));
  const rows = [...byCampaign].sort((a, b) => b.leads - a.leads);

  return (
    <TableCard>
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
            <TableHead className="pl-6">Leads by campaign</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Cost per lead</TableHead>
            <TableHead className="text-right">Won</TableHead>
            <TableHead className="text-right">Close rate</TableHead>
            <TableHead className="pr-6 text-right">Won value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const cost = spendById.get(row.campaignId);
            return (
              <TableRow key={row.campaignId} className="text-[15px]">
                <TableCell className="max-w-[280px] truncate py-[16px] pl-6 font-medium">
                  {row.campaignName}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {cost !== undefined
                    ? formatMoney(Math.round(cost * 100), currency)
                    : "–"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.leads.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {cost !== undefined && row.leads > 0
                    ? formatMoney(Math.round((cost / row.leads) * 100), currency)
                    : "–"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.won.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.leads > 0
                    ? `${Math.round((row.won / row.leads) * 100)}%`
                    : "–"}
                </TableCell>
                <TableCell className="pr-6 text-right tabular-nums">
                  {row.wonValueCents > 0
                    ? formatMoney(row.wonValueCents, currency)
                    : "–"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableCard>
  );
}
