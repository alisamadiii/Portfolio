"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Megaphone,
  Search,
  ShieldCheck,
} from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Area, AreaChart, XAxis } from "recharts";
import { toast } from "sonner";

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
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useTRPC } from "@workspace/trpc/client";
import {
  CATEGORY_LABELS,
  CONVERSION_PRESETS,
  STAGE_LABELS,
  TRACKING_LABELS,
  trackingStatus,
  WIRABLE_STAGES,
} from "@workspace/trpc/lib/agency/conversion-presets";
import { STARTER_NEGATIVE_LISTS } from "@workspace/trpc/lib/agency/negative-lists";
import { cn } from "@workspace/ui/lib/utils";

import { formatMoney, lastDays, RANGES, type RangeValue } from "@/components/agency/lead-status";
import { useAgency } from "@/components/agency/use-agency";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge, StatusText, type BadgeTone } from "@/components/ds/ui/badge";
import { Button, buttonClass } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Input } from "@/components/ds/ui/field";
import { EmptyState, IconTile, KpiGrid, Progress } from "@/components/ds/ui/misc";
import { UnderlineTabs } from "@/components/ds/ui/tabs";
import { repoPath } from "@/lib/paths";
import { handleCmsError } from "@/lib/trpc-errors";

const TABS = ["overview", "budget", "search-terms", "conversions", "lsa"] as const;
type Tab = (typeof TABS)[number];

const trafficConfig = {
  cost: { label: "Spend", color: "var(--chart-3)" },
  clicks: { label: "Clicks", color: "var(--chart-1)" },
} satisfies ChartConfig;

const num = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const money = (amount: number, currency = "USD") => formatMoney(Math.round(amount * 100), currency);

/** Alert links were written for the old Marketing pages; map them onto this page's tabs. */
const alertTab = (href: string): Tab =>
  href.includes("budget")
    ? "budget"
    : href.includes("conversions")
      ? "conversions"
      : href.includes("search-terms")
        ? "search-terms"
        : "overview";

function useAdsInvalidate() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: trpc.agency.ads.pathKey() });
}

/** Google Ads app: performance, budget pacing, search terms, conversion tracking (+ LSA). */
export function GoogleAdsPage() {
  const { adsConnected, adsType } = useAgency();
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("overview"));
  const [days, setDays] = useState<RangeValue>("30");
  const range = useMemo(() => lastDays(Number(days)), [days]);
  const showLsa = adsType === "lsa" || adsType === "both";

  const rangeMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button trailingIcon={<ChevronDown className="size-3.5" />}>
            {RANGES.find((r) => r.value === days)?.label}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {RANGES.map((r) => (
          <DropdownMenuItem key={r.value} onClick={() => setDays(r.value)}>
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <PageHeader
        title="Google Ads"
        description="What your ads cost, what they bring in, and where the budget goes."
        actions={adsConnected && tab !== "budget" && tab !== "conversions" ? rangeMenu : undefined}
        tabs={
          <UnderlineTabs
            label="Google Ads sections"
            value={tab}
            onChange={(id) => void setTab(id as Tab)}
            items={[
              { id: "overview", label: "Overview" },
              { id: "budget", label: "Budget" },
              { id: "search-terms", label: "Search terms" },
              { id: "conversions", label: "Conversions" },
              ...(showLsa ? [{ id: "lsa", label: "Local Services" }] : []),
            ]}
          />
        }
      />
      {!adsConnected ? (
        <Card>
          <EmptyState
            icon={<Megaphone className="size-5" />}
            title="No Google Ads account linked yet"
            text="We connect your Google Ads account for you. Once it's linked, spend, campaigns and search terms show up here."
            action={
              <RequestDialog defaultSubject="Link my Google Ads account">
                <span className={buttonClass("primary", "sm")}>Contact support</span>
              </RequestDialog>
            }
          />
        </Card>
      ) : tab === "overview" ? (
        <Overview range={range} onOpenTab={(t) => void setTab(t)} />
      ) : tab === "budget" ? (
        <BudgetTab />
      ) : tab === "search-terms" ? (
        <SearchTermsTab range={range} />
      ) : tab === "conversions" ? (
        <ConversionsTab range={range} />
      ) : (
        <LsaTab range={range} />
      )}
    </>
  );
}

// ─── Overview ───────────────────────────────────────────────────

function Overview({
  range,
  onOpenTab,
}: {
  range: { from: string; to: string };
  onOpenTab: (tab: Tab) => void;
}) {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const stats = useQuery(
    trpc.agency.ads.stats.queryOptions({ projectId, ...range }, { placeholderData: keepPreviousData })
  );
  const leads = useQuery(
    trpc.agency.leads.stats.queryOptions({ projectId, ...range }, { placeholderData: keepPreviousData })
  );
  const alerts = useQuery(trpc.agency.ads.alerts.queryOptions({ projectId }));

  const data = stats.data;
  const currency = data?.currency ?? "USD";
  const adLeads = leads.data?.byChannel.find((c) => c.channel === "google_ads")?.leads;
  const kpis = [
    { label: "Spend", value: data ? money(data.totals.cost, currency) : "—" },
    { label: "Clicks", value: data ? num(data.totals.clicks) : "—" },
    { label: "Impressions", value: data ? num(data.totals.impressions) : "—" },
    { label: "Conversions", value: data ? num(data.totals.conversions) : "—" },
    {
      label: "Cost per conversion",
      value: data && data.totals.conversions > 0 ? money(data.totals.cost / data.totals.conversions, currency) : "—",
    },
    { label: "Leads from ads", value: adLeads != null ? String(adLeads) : "—" },
  ];

  type Campaign = NonNullable<typeof data>["campaigns"][number];
  const columns: Column<Campaign>[] = [
    {
      key: "name",
      header: "Campaign",
      width: "minmax(220px, 2fr)",
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-ink">{c.name}</span>
          <span className="text-xs text-dim">{channelLabel(c.channel)}</span>
        </span>
      ),
    },
    { key: "status", header: "Status", width: "minmax(100px, 0.8fr)", cell: (c) => <CampaignStatus status={c.status} /> },
    { key: "cost", header: "Spend", width: "minmax(90px, 0.8fr)", align: "end", cell: (c) => <span className="tabular-nums">{money(c.cost, currency)}</span> },
    { key: "clicks", header: "Clicks", width: "minmax(70px, 0.6fr)", align: "end", cell: (c) => <span className="tabular-nums">{num(c.clicks)}</span> },
    { key: "conv", header: "Conv.", width: "minmax(70px, 0.6fr)", align: "end", cell: (c) => <span className="tabular-nums">{num(c.conversions)}</span> },
    {
      key: "cpa",
      header: "Cost / conv.",
      width: "minmax(100px, 0.8fr)",
      align: "end",
      cell: (c) => <span className="tabular-nums">{c.conversions > 0 ? money(c.cost / c.conversions, currency) : "—"}</span>,
    },
  ];

  return (
    <>
      {(alerts.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader title="Needs attention" divided />
          {alerts.data!.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onOpenTab(alertTab(a.href))}
              className="flex w-full items-start gap-3 border-b border-divider px-6 py-4 text-left last:border-b-0 hover:bg-sidebar"
            >
              <AlertTriangle
                className={cn("mt-0.5 size-4 shrink-0", a.severity === "critical" ? "text-danger" : "text-warning")}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-ink">{a.title}</span>
                <span className="text-[13px] text-dim">{a.detail}</span>
              </span>
            </button>
          ))}
        </Card>
      )}

      {stats.error ? (
        <ErrorCard message={stats.error.message} />
      ) : (
        <>
          <div className={cn("transition-opacity", stats.isPlaceholderData && "opacity-60")}>
            <KpiGrid items={kpis} />
          </div>
          <Card>
            <CardHeader title="Spend and clicks over time" />
            <div className="px-6 pb-6">
              {stats.isPending ? (
                <Skeleton className="h-[200px] w-full rounded-inner" />
              ) : !data || data.days.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-[13px] text-faint">
                  No ad activity in this period.
                </div>
              ) : (
                <ChartContainer config={trafficConfig} className="h-[220px] w-full">
                  <AreaChart data={data.days}>
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => (v ? format(parseISO(v), "MMM d") : "")}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(v) => (typeof v === "string" && v ? format(parseISO(v), "MMM d, yyyy") : "")}
                        />
                      }
                    />
                    <Area dataKey="clicks" type="monotone" fill="var(--color-clicks)" fillOpacity={0.12} stroke="var(--color-clicks)" strokeWidth={2} />
                    <Area dataKey="cost" type="monotone" fill="var(--color-cost)" fillOpacity={0.18} stroke="var(--color-cost)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Campaigns" divided />
            <DataTable
              columns={columns}
              rows={data?.campaigns ?? []}
              rowKey={(c) => c.id}
              minWidth={720}
              empty={
                stats.isPending ? (
                  <div className="px-6 py-12 text-center text-[13px] text-dim">Loading campaigns…</div>
                ) : (
                  <EmptyState icon={<Megaphone className="size-5" />} title="No campaigns yet" text="Campaigns in the linked Google Ads account show up here." />
                )
              }
            />
          </Card>
        </>
      )}
    </>
  );
}

const channelLabel = (channel: string) =>
  ({ SEARCH: "Search", PERFORMANCE_MAX: "Performance Max", DISPLAY: "Display", LOCAL_SERVICES: "Local Services", VIDEO: "Video" })[channel] ??
  channel.toLowerCase().replace(/_/g, " ");

function CampaignStatus({ status }: { status: string }) {
  if (status === "ENABLED") return <StatusText>Running</StatusText>;
  if (status === "PAUSED") return <StatusText tone="neutral">Paused</StatusText>;
  return <StatusText tone="neutral">{status.toLowerCase()}</StatusText>;
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="flex items-start gap-3 p-6">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Google Ads didn&apos;t answer</span>
        <span className="text-[13px] text-dim">{message}</span>
      </div>
    </Card>
  );
}

// ─── Budget ─────────────────────────────────────────────────────

const PACING: Record<string, { tone: BadgeTone; label: string }> = {
  on_pace: { tone: "success", label: "On pace" },
  underspending: { tone: "warning", label: "Underspending" },
  overspending: { tone: "coral", label: "Overspending" },
};

function BudgetTab() {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const invalidate = useAdsInvalidate();
  const budget = useQuery(trpc.agency.ads.budget.get.queryOptions({ projectId }));
  const [target, setTarget] = useState<string | null>(null);

  const setTargetMutation = useMutation(
    trpc.agency.ads.budget.setTarget.mutationOptions({
      onSuccess: () => {
        toast.success("Monthly target saved.");
        setTarget(null);
        void invalidate();
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't save the target.")),
    })
  );

  if (budget.isPending) return <Skeleton className="h-64 w-full rounded-card" />;
  if (budget.error) return <ErrorCard message={budget.error.message} />;
  const data = budget.data;
  if (!data) return null;

  const currency = data.currency;
  const pacing = data.pacing;
  const targetValue = target ?? (data.targetCents ? String(data.targetCents / 100) : "");
  const targetCents = targetValue.trim() ? Math.round(Number(targetValue) * 100) : null;
  const invalid = targetCents !== null && (!Number.isFinite(targetCents) || targetCents < 100);

  return (
    <>
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-dim">Spent this month</span>
            <span className="text-2xl font-semibold tracking-[-0.01em]">{formatMoney(data.spentCents, currency)}</span>
            <span className="text-[13px] text-dim">
              {data.targetCents ? `of ${formatMoney(data.targetCents, currency)} target` : "No monthly target set"}
              {` · ${pacing.daysLeft} days left`}
            </span>
          </div>
          {pacing.status && <Badge tone={PACING[pacing.status]!.tone} dot>{PACING[pacing.status]!.label}</Badge>}
        </div>
        {data.targetCents ? <Progress value={(data.spentCents / data.targetCents) * 100} /> : null}
        <div className="grid gap-4 border-t border-divider pt-4 sm:grid-cols-3">
          <Fact label="Projected month end" value={formatMoney(pacing.projectedCents, currency)} />
          <Fact label="Pace vs target" value={pacing.pace != null ? `${Math.round(pacing.pace * 100)}%` : "—"} />
          <Fact
            label="Daily budget to land on target"
            value={pacing.suggestedDailyCents != null ? formatMoney(pacing.suggestedDailyCents, currency) : "—"}
          />
        </div>
        {data.canManage && (
          <div className="flex flex-wrap items-end gap-2 border-t border-divider pt-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Monthly target</span>
              <span className="flex items-center gap-2">
                <span className="text-dim">$</span>
                <Input
                  inputMode="decimal"
                  className="w-40"
                  value={targetValue}
                  placeholder="e.g. 1500"
                  onChange={(e) => setTarget(e.target.value)}
                />
              </span>
            </label>
            <Button
              variant="primary"
              disabled={invalid || setTargetMutation.isPending || target === null}
              onClick={() => setTargetMutation.mutate({ projectId, monthlyCents: targetCents })}
            >
              Save target
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Daily budgets" divided />
        {data.campaigns.length === 0 ? (
          <EmptyState icon={<Megaphone className="size-5" />} title="No campaigns yet" text="Campaign budgets show up here once the account has campaigns." />
        ) : (
          data.campaigns.map((c) => <BudgetRow key={c.id} campaign={c} currency={currency} canManage={data.canManage} />)
        )}
      </Card>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] text-dim">{label}</span>
      <span className={cn("text-base font-semibold", value === "—" && "text-faint")}>{value}</span>
    </div>
  );
}

function BudgetRow({
  campaign,
  currency,
  canManage,
}: {
  campaign: {
    id: string;
    name: string;
    status: string;
    budgetResourceName: string;
    dailyBudgetCents: number;
    spentCents: number;
    budgetLostShare: number;
  };
  currency: string;
  canManage: boolean;
}) {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const invalidate = useAdsInvalidate();
  const [value, setValue] = useState<string | null>(null);
  const daily = value ?? String(campaign.dailyBudgetCents / 100);
  const cents = Math.round(Number(daily) * 100);
  const save = useMutation(
    trpc.agency.ads.budget.setCampaignBudget.mutationOptions({
      onSuccess: () => {
        toast.success(`Daily budget updated for ${campaign.name}.`);
        setValue(null);
        void invalidate();
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't update the budget.")),
    })
  );
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-divider px-6 py-4 last:border-b-0">
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{campaign.name}</span>
        <span className="text-xs text-dim">
          {formatMoney(campaign.spentCents, currency)} spent this month
          {campaign.budgetLostShare > 0.05 && ` · losing ${Math.round(campaign.budgetLostShare * 100)}% of searches to budget`}
        </span>
      </div>
      <CampaignStatus status={campaign.status} />
      {canManage && campaign.budgetResourceName ? (
        <span className="flex items-center gap-2">
          <span className="text-dim">$</span>
          <Input inputMode="decimal" className="w-28" value={daily} onChange={(e) => setValue(e.target.value)} aria-label={`Daily budget for ${campaign.name}`} />
          <span className="text-xs text-dim">/ day</span>
          <Button
            size="sm"
            disabled={value === null || !Number.isFinite(cents) || cents < 100 || save.isPending}
            onClick={() => save.mutate({ projectId, budgetResourceName: campaign.budgetResourceName, dailyBudgetCents: cents })}
          >
            Save
          </Button>
        </span>
      ) : (
        <span className="text-sm tabular-nums">{formatMoney(campaign.dailyBudgetCents, currency)} / day</span>
      )}
    </div>
  );
}

// ─── Search terms + negatives ───────────────────────────────────

function SearchTermsTab({ range }: { range: { from: string; to: string } }) {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const invalidate = useAdsInvalidate();
  const [search, setSearch] = useState("");
  const terms = useQuery(
    trpc.agency.ads.searchTerms.list.queryOptions({ projectId, ...range }, { placeholderData: keepPreviousData })
  );
  const lists = useQuery(trpc.agency.ads.negativeLists.list.queryOptions({ projectId }));
  const exclude = useMutation(
    trpc.agency.ads.searchTerms.exclude.mutationOptions({
      onSuccess: (_d, vars) => {
        toast.success(`"${vars.term}" excluded.`);
        void invalidate();
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't exclude that term.")),
    })
  );
  const applyList = useMutation(
    trpc.agency.ads.negativeLists.applyList.mutationOptions({
      onSuccess: (r) => {
        toast.success(`Applied ${r.keywords} negative keywords to ${r.attachedCampaigns} campaigns.`);
        void invalidate();
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't apply that list.")),
    })
  );

  type Row = NonNullable<typeof terms.data>["rows"][number];
  const canManage = terms.data?.canManage ?? false;
  const q = search.trim().toLowerCase();
  const rows = (terms.data?.rows ?? []).filter((r) => !q || r.term.toLowerCase().includes(q));
  const columns: Column<Row>[] = [
    {
      key: "term",
      header: "Search term",
      width: "minmax(220px, 2fr)",
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-ink">{r.term}</span>
          <span className="truncate text-xs text-dim">{r.campaignName}</span>
        </span>
      ),
    },
    { key: "cost", header: "Spend", width: "minmax(80px, 0.7fr)", align: "end", cell: (r) => <span className="tabular-nums">{formatMoney(r.costCents)}</span> },
    { key: "clicks", header: "Clicks", width: "minmax(60px, 0.5fr)", align: "end", cell: (r) => <span className="tabular-nums">{num(r.clicks)}</span> },
    { key: "conv", header: "Conv.", width: "minmax(60px, 0.5fr)", align: "end", cell: (r) => <span className="tabular-nums">{num(r.conversions)}</span> },
    {
      key: "action",
      header: "",
      width: "120px",
      align: "end",
      cell: (r) =>
        r.status === "EXCLUDED" ? (
          <Badge tone="neutral">Excluded</Badge>
        ) : canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm" trailingIcon={<ChevronDown className="size-3" />}>Exclude</Button>} />
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onClick={() => exclude.mutate({ projectId, campaignId: r.campaignId, term: r.term.slice(0, 80), matchType: "EXACT" })}>
                Exact match
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exclude.mutate({ projectId, campaignId: r.campaignId, term: r.term.slice(0, 80), matchType: "PHRASE" })}>
                Phrase match
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
    },
  ];

  const industry = lists.data?.industry ?? null;
  const starter = STARTER_NEGATIVE_LISTS.filter((l) => !l.industry || l.industry === industry);
  const applied = new Set(lists.data?.applied ?? []);

  return (
    <>
      <Card>
        <CardHeader title="Starter negative keyword lists" divided />
        <p className="px-6 pt-4 text-[13px] text-dim">
          Ready-made lists of searches that never turn into customers (jobs, DIY, free…). Applying one blocks them across every campaign.
        </p>
        <div className="grid gap-3 p-6 sm:grid-cols-2">
          {starter.map((l) => (
            <div key={l.key} className="flex flex-col gap-2 rounded-inner border border-divider p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{l.label}</span>
                {applied.has(l.key) && <Badge tone="success" icon={<Check className="size-3" />}>Applied</Badge>}
              </div>
              <span className="text-[13px] text-dim">{l.note}</span>
              <span className="text-xs text-faint">{l.words.length} keywords</span>
              {!applied.has(l.key) && lists.data?.canManage && lists.data.adsConnected && (
                <Button
                  size="sm"
                  className="self-start"
                  icon={<ShieldCheck className="size-3.5" />}
                  disabled={applyList.isPending}
                  onClick={() => applyList.mutate({ projectId, listKey: l.key })}
                >
                  Apply list
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className={cn("transition-opacity", terms.isPlaceholderData && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-3 border-b border-divider px-6 py-3">
          <h2 className="text-base font-semibold">Search terms</h2>
          <div className="flex-1" />
          <label className="flex h-9 w-[240px] max-w-full items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-dim">
            <Search className="size-4" aria-hidden />
            <input
              type="search"
              aria-label="Filter search terms"
              placeholder="Filter terms"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            />
          </label>
        </div>
        {terms.error ? (
          <div className="p-6 text-sm text-danger">{terms.error.message}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => `${r.campaignId}:${r.term}`}
            minWidth={640}
            empty={
              terms.isPending ? (
                <div className="px-6 py-12 text-center text-[13px] text-dim">Loading search terms…</div>
              ) : (
                <EmptyState icon={<Search className="size-5" />} title="No search terms" text="What people typed before clicking your ads shows up here." />
              )
            }
          />
        )}
      </Card>
    </>
  );
}

// ─── Conversions ────────────────────────────────────────────────

const TRACKING_TONE: Record<string, "success" | "neutral" | "danger"> = {
  recording: "success",
  awaiting: "neutral",
  no_recent: "danger",
  inactive: "neutral",
};

function ConversionsTab({ range }: { range: { from: string; to: string } }) {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const invalidate = useAdsInvalidate();
  const list = useQuery(trpc.agency.ads.conversions.list.queryOptions({ projectId, ...range }));
  const apply = useMutation(
    trpc.agency.ads.conversions.applyPreset.mutationOptions({
      onSuccess: (r) => {
        toast.success(`Conversion tracking set up: ${r.created} created, ${r.reused} reused.`);
        void invalidate();
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't set up conversions.")),
    })
  );

  if (list.isPending) return <Skeleton className="h-64 w-full rounded-card" />;
  if (list.error) return <ErrorCard message={list.error.message} />;
  const data = list.data;
  if (!data) return null;

  const byResource = new Map(data.actions.map((a) => [a.resourceName, a]));
  const anyWired = WIRABLE_STAGES.some((s) => data.wired[s]);
  type Action = (typeof data.actions)[number];
  const columns: Column<Action>[] = [
    {
      key: "name",
      header: "Conversion action",
      width: "minmax(220px, 2fr)",
      cell: (a) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-ink">{a.name}</span>
          <span className="text-xs text-dim">{CATEGORY_LABELS[a.category] ?? a.category}</span>
        </span>
      ),
    },
    {
      key: "tracking",
      header: "Tracking",
      width: "minmax(170px, 1fr)",
      cell: (a) => {
        const t = trackingStatus(a);
        const tone = TRACKING_TONE[t] ?? "neutral";
        return <StatusText tone={tone}>{TRACKING_LABELS[t]}</StatusText>;
      },
    },
    { key: "7d", header: "Last 7 days", width: "minmax(90px, 0.6fr)", align: "end", cell: (a) => <span className="tabular-nums">{num(a.last7Days)}</span> },
    { key: "range", header: "In range", width: "minmax(80px, 0.6fr)", align: "end", cell: (a) => <span className="tabular-nums">{num(a.allConversions)}</span> },
  ];

  return (
    <>
      <Card>
        <CardHeader title="What we report to Google Ads" divided />
        <div className="grid gap-px bg-divider sm:grid-cols-2">
          {WIRABLE_STAGES.map((stage) => {
            const resource = data.wired[stage];
            const action = resource ? byResource.get(resource) : undefined;
            const uploads = data.uploads[stage];
            return (
              <div key={stage} className="flex flex-col gap-1 bg-surface px-6 py-4">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{STAGE_LABELS[stage]}</span>
                  {resource ? <Badge tone="success" dot>Wired</Badge> : <Badge tone="neutral">Not set up</Badge>}
                </span>
                <span className="truncate text-[13px] text-dim">{action?.name ?? (resource ? "Action not found in account" : "No conversion action")}</span>
                <span className="text-xs text-faint">
                  {uploads.count} uploaded
                  {uploads.lastAt ? ` · last ${format(new Date(uploads.lastAt), "MMM d")}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {data.canManage && (
        <Card className="flex flex-col gap-3 p-6">
          {CONVERSION_PRESETS.map((preset) => (
            <div key={preset.id} className="flex flex-wrap items-start gap-4">
              <IconTile>
                <ShieldCheck className="size-5" strokeWidth={1.8} />
              </IconTile>
              <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
                <span className="text-[15px] font-semibold">{preset.name}</span>
                <span className="text-[13px] text-dim">{preset.description}</span>
              </div>
              <Button variant={anyWired ? "outline" : "primary"} disabled={apply.isPending} onClick={() => apply.mutate({ projectId, presetId: preset.id })}>
                {anyWired ? "Re-apply" : "Set up tracking"}
              </Button>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <CardHeader title="Conversion actions in the account" divided />
        <DataTable
          columns={columns}
          rows={data.actions}
          rowKey={(a) => a.resourceName}
          minWidth={600}
          empty={<EmptyState icon={<ShieldCheck className="size-5" />} title="No conversion actions" text="Set up tracking above and the actions appear here." />}
        />
      </Card>
    </>
  );
}

// ─── Local Services ─────────────────────────────────────────────

function LsaTab({ range }: { range: { from: string; to: string } }) {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const stats = useQuery(trpc.agency.ads.lsa.stats.queryOptions({ projectId, ...range }, { placeholderData: keepPreviousData }));
  const leads = useQuery(trpc.agency.ads.lsa.leads.queryOptions({ projectId, ...range }, { placeholderData: keepPreviousData }));

  type Lead = NonNullable<typeof leads.data>[number];
  const columns: Column<Lead>[] = [
    {
      key: "who",
      header: "Lead",
      width: "minmax(200px, 2fr)",
      cell: (l) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-ink">{l.contact?.name || l.contact?.phone || "Hidden by Google"}</span>
          <span className="truncate text-xs text-dim">{[l.service, l.category].filter(Boolean).join(" · ")}</span>
        </span>
      ),
    },
    { key: "type", header: "Type", width: "minmax(90px, 0.8fr)", cell: (l) => <Badge tone="neutral">{l.leadType.replace("_", " ").toLowerCase()}</Badge> },
    {
      key: "charged",
      header: "Charge",
      width: "minmax(100px, 0.8fr)",
      cell: (l) => (
        <StatusText tone={l.chargedStatus === "charged" ? "success" : "neutral"}>
          {l.chargedStatus.replace("_", " ")}
        </StatusText>
      ),
    },
    { key: "at", header: "Received", width: "minmax(110px, 0.8fr)", cell: (l) => <span className="text-dim">{format(new Date(l.createdAt), "MMM d, p")}</span> },
  ];

  return (
    <>
      {stats.error ? (
        <ErrorCard message={stats.error.message} />
      ) : (
        <KpiGrid
          items={[
            { label: "Spend", value: stats.data ? money(stats.data.totals.cost) : "—" },
            { label: "Impressions", value: stats.data ? num(stats.data.totals.impressions) : "—" },
            { label: "Leads", value: leads.data ? String(leads.data.length) : "—" },
            {
              label: "Charged leads",
              value: leads.data ? String(leads.data.filter((l) => l.chargedStatus === "charged").length) : "—",
            },
          ]}
        />
      )}
      <Card>
        <CardHeader title="Local Services leads" divided />
        <DataTable
          columns={columns}
          rows={leads.data ?? []}
          rowKey={(l) => l.id}
          minWidth={600}
          empty={
            leads.isPending ? (
              <div className="px-6 py-12 text-center text-[13px] text-dim">Loading leads…</div>
            ) : (
              <EmptyState icon={<Megaphone className="size-5" />} title="No Local Services leads" text="Calls and messages from your Local Services ads show up here." />
            )
          }
        />
      </Card>
      <p className="text-xs text-faint">
        Local Services leads stay in Google.{" "}
        <Link href={repoPath(projectId, "leads")} className="text-coral-text">
          Leads
        </Link>{" "}
        covers your website form leads.
      </p>
    </>
  );
}
