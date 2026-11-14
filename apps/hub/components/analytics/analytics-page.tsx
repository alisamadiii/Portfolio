"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { BarChart3, ChevronDown, FileText, Globe } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Area, AreaChart, Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useTRPC } from "@workspace/trpc/client";
import { authClient } from "@workspace/auth/auth-client";
import { cn } from "@workspace/ui/lib/utils";

import { PageHeader } from "@/components/ds/layout/page-header";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Select } from "@/components/ds/ui/field";
import { EmptyState, IconTile, KpiGrid } from "@/components/ds/ui/misc";
import { UnderlineTabs } from "@/components/ds/ui/tabs";
import { useRouteProjectId } from "@/hooks/use-repo";
import { connectErrorURL } from "@/lib/connect-errors";

const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "28d", label: "Last 28 days" },
  { value: "90d", label: "Last 90 days" },
] as const;
type RangeValue = (typeof RANGES)[number]["value"];

const TABS = ["overview", "pages", "sources"] as const;
type Tab = (typeof TABS)[number];

const trafficConfig = {
  activeUsers: { label: "Visitors", color: "var(--chart-3)" },
  sessions: { label: "Sessions", color: "var(--chart-1)" },
} satisfies ChartConfig;
const channelsConfig = { sessions: { label: "Sessions", color: "var(--chart-2)" } } satisfies ChartConfig;
const chartColor = (index: number) => `var(--chart-${(index % 5) + 1})`;

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
const share = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

// Bare GA source names (no dot) → favicon domain. Dotted sources are used as-is.
const SOURCE_DOMAINS: Record<string, string> = {
  google: "google.com", bing: "bing.com", yahoo: "yahoo.com", duckduckgo: "duckduckgo.com",
  instagram: "instagram.com", facebook: "facebook.com", twitter: "x.com", x: "x.com",
  linkedin: "linkedin.com", youtube: "youtube.com", tiktok: "tiktok.com", pinterest: "pinterest.com",
  reddit: "reddit.com", resend: "resend.com", usesend: "usesend.com",
};
const sourceDomain = (source: string) => {
  const key = source.toLowerCase();
  if (SOURCE_DOMAINS[key]) return SOURCE_DOMAINS[key];
  return key.includes(".") ? key : null;
};
function SourceIcon({ source }: { source: string }) {
  const [failed, setFailed] = useState(false);
  const domain = sourceDomain(source);
  if (!domain || failed) return <Globe className="size-4 shrink-0 text-faint" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      className="size-4 shrink-0 rounded-sm"
      onError={() => setFailed(true)}
    />
  );
}
const flagEmoji = (code: string) =>
  /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)))
    : null;

/** Analytics app: property picker until connected, then KPIs, traffic chart, pages and sources. */
export function AnalyticsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("overview"));
  const [range, setRange] = useState<RangeValue>("28d");
  const [pickedProperty, setPickedProperty] = useState("");

  const status = useQuery(trpc.analytics.status.queryOptions({ projectId }, { enabled: !!projectId }));
  const connected = status.data?.connected === true;

  // Property picker source, only while unconnected. PRECONDITION_FAILED until
  // the caller linked Google with the GA scope: that's the "sign in" signal.
  const properties = useQuery(
    trpc.analytics.properties.queryOptions(
      { projectId },
      { enabled: !!projectId && status.data?.connected === false, retry: false }
    )
  );
  const statusKey = trpc.analytics.status.queryOptions({ projectId }).queryKey;
  const connect = useMutation(
    trpc.analytics.connect.mutationOptions({
      onSuccess: () => {
        toast.success("Google Analytics connected");
        void queryClient.invalidateQueries({ queryKey: statusKey });
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const disconnect = useMutation(
    trpc.analytics.disconnect.mutationOptions({
      onSuccess: () => {
        setPickedProperty("");
        void queryClient.invalidateQueries({ queryKey: statusKey });
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const report = useQuery(
    trpc.analytics.report.queryOptions(
      { projectId, range },
      { enabled: connected, retry: false, placeholderData: keepPreviousData }
    )
  );
  const chartData = useMemo(() => report.data?.timeseries ?? [], [report.data]);

  const linkGoogle = async () => {
    const { error } = await authClient.linkSocial({
      provider: "google",
      scopes: [GA_SCOPE],
      callbackURL: window.location.href,
      errorCallbackURL: connectErrorURL("Google Analytics"),
    });
    if (error) toast.error(error.message ?? "Could not start Google sign-in");
  };

  const kpis = report.data?.kpis;
  const needsReconnect = connected && report.isError;
  const dim = !connected || needsReconnect || !kpis;
  const kpiItems = [
    { label: "Visitors", value: kpis ? String(kpis.activeUsers) : "—" },
    { label: "Sessions", value: kpis ? String(kpis.sessions) : "—" },
    {
      label: "Pages per session",
      value: kpis && kpis.sessions ? (kpis.screenPageViews / kpis.sessions).toFixed(1) : "—",
    },
    { label: "Avg. time on site", value: kpis ? formatDuration(kpis.averageSessionDuration) : "—" },
  ];

  const topPages = report.data?.topPages ?? [];
  const totalViews = topPages.reduce((n, p) => n + p.views, 0);
  const pageColumns: Column<{ path: string; views: number }>[] = [
    { key: "page", header: "Page", width: "minmax(220px, 3fr)", cell: (p) => <span className="truncate text-ink">{p.path}</span> },
    { key: "views", header: "Views", width: "minmax(90px, 1fr)", align: "end", cell: (p) => <span className="tabular-nums">{p.views}</span> },
    { key: "share", header: "Share", width: "minmax(90px, 1fr)", align: "end", cell: (p) => <span className="tabular-nums text-dim">{share(p.views, totalViews)}</span> },
  ];
  const pagesTable = (rows: typeof topPages) => (
    <DataTable
      columns={pageColumns}
      rows={rows}
      rowKey={(p) => p.path}
      minWidth={480}
      empty={
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No page data yet"
          text={connected ? "No page views in this period." : "Your most-viewed pages show up here once a property is connected."}
        />
      }
    />
  );

  const rangeMenu = connected && (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="sm" trailingIcon={<ChevronDown className="size-3.5" />}>
              {RANGES.find((r) => r.value === range)?.label}
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {RANGES.map((r) => (
            <DropdownMenuItem key={r.value} onClick={() => setRange(r.value)}>
              {r.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="sm" variant="ghost" disabled={disconnect.isPending} onClick={() => setConfirmDisconnect(true)}>
        Disconnect
      </Button>
      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Disconnect Google Analytics?"
        description="This project stops showing analytics until a property is connected again. Nothing changes in Google Analytics itself."
        confirmLabel="Disconnect"
        danger
        onConfirm={() => disconnect.mutate({ projectId })}
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Visitors, sessions and your most-viewed pages from Google Analytics."
        actions={rangeMenu || undefined}
        tabs={
          <UnderlineTabs
            label="Analytics sections"
            value={tab}
            onChange={(id) => void setTab(id as Tab)}
            items={[
              { id: "overview", label: "Overview" },
              { id: "pages", label: "Pages" },
              { id: "sources", label: "Sources" },
            ]}
          />
        }
      />

      {status.isPending ? (
        <Skeleton className="h-40 w-full rounded-card" />
      ) : !connected ? (
        <Card className="flex gap-4 border-coral p-6 shadow-[0_0_0_3px_var(--color-coral-soft)]">
          <IconTile size={48}>
            <BarChart3 className="size-5" strokeWidth={1.8} />
          </IconTile>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold">Choose this site&apos;s Analytics property</h2>
              <p className="max-w-[560px] text-sm leading-relaxed text-dim">
                {properties.isError
                  ? "Sign in with the Google account that has access to this website's Google Analytics, and your traffic shows up here."
                  : "Your Google account is connected in Integrations. Pick the property that belongs to this site and your traffic shows up here."}
              </p>
            </div>
            {properties.isLoading ? (
              <Skeleton className="h-9 w-72 rounded-control" />
            ) : properties.isError ? (
              <div>
                <Button variant="primary" onClick={linkGoogle}>
                  Sign in with Google
                </Button>
                <p className="mt-2 text-[13px] text-dim">
                  Read-only access to your Analytics data. We can never change anything in your Google account.
                </p>
              </div>
            ) : (properties.data?.length ?? 0) === 0 ? (
              <p className="text-[13px] text-dim">
                Your Google account has no Analytics properties. Sign in with a different account, or
                create a property in Google Analytics first.
              </p>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Property" className="w-80 max-w-full">
                  <Select value={pickedProperty} onChange={(e) => setPickedProperty(e.target.value)}>
                    <option value="">Choose a property…</option>
                    {properties.data!.map((p) => (
                      <option key={p.propertyId} value={p.propertyId}>
                        {p.displayName}
                        {p.account ? ` · ${p.account}` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button
                  variant="primary"
                  disabled={!pickedProperty || connect.isPending}
                  onClick={() => connect.mutate({ projectId, propertyId: pickedProperty })}
                >
                  Connect
                </Button>
              </div>
            )}
            <Link href="/integrations" className="self-start text-[13px] font-medium text-coral-text">
              Manage Google account in Integrations
            </Link>
          </div>
        </Card>
      ) : needsReconnect ? (
        <Card className="flex flex-col items-start gap-3 p-6">
          <h2 className="text-base font-semibold">Google Analytics needs to be reconnected</h2>
          <p className="text-sm text-dim">
            Access to the connected Google account expired or was revoked. Sign in again to keep the
            data flowing.
          </p>
          <Button variant="primary" onClick={linkGoogle}>
            Sign in with Google
          </Button>
        </Card>
      ) : null}

      {tab === "overview" && (
        <div className={cn("flex flex-col gap-5 transition-opacity", report.isPlaceholderData && "opacity-60")}>
          <KpiGrid items={kpiItems} dim={dim} />
          <Card>
            <CardHeader title="Visitors over time" />
            <div className="px-6 pb-6">
              {connected && report.isLoading ? (
                <Skeleton className="h-[180px] w-full rounded-inner" />
              ) : !connected || !report.data ? (
                <div className="flex h-[180px] items-center justify-center border-y border-divider text-[13px] text-faint">
                  Chart appears after you connect
                </div>
              ) : (
                <ChartContainer config={trafficConfig} className="h-[220px] w-full">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-activeUsers)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="var(--color-activeUsers)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="fillSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-sessions)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-sessions)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: string) => (value ? format(parseISO(value), "MMM d") : "")}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) =>
                            typeof value === "string" && value ? format(parseISO(value), "MMM d, yyyy") : ""
                          }
                        />
                      }
                    />
                    <Area dataKey="sessions" type="monotone" fill="url(#fillSessions)" stroke="var(--color-sessions)" strokeWidth={2} />
                    <Area dataKey="activeUsers" type="monotone" fill="url(#fillUsers)" stroke="var(--color-activeUsers)" strokeWidth={2} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Top pages" divided />
            {pagesTable(topPages.slice(0, 5))}
          </Card>
        </div>
      )}

      {tab === "pages" && (
        <Card className={cn(report.isPlaceholderData && "opacity-60")}>
          <CardHeader title="All pages" divided />
          {pagesTable(topPages)}
        </Card>
      )}

      {tab === "sources" && (
        <div className={cn("grid gap-5 lg:grid-cols-2", report.isPlaceholderData && "opacity-60")}>
          <Card>
            <CardHeader title="Where visitors come from" />
            <div className="px-6 pb-6">
              {!report.data || report.data.channels.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-faint">
                  {connected ? "No sessions in this period." : "Appears after you connect."}
                </p>
              ) : (
                <ChartContainer config={channelsConfig} className="h-[220px] w-full">
                  <BarChart data={report.data.channels} layout="vertical" margin={{ left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="channel" type="category" tickLine={false} axisLine={false} width={90} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="sessions" radius={4}>
                      {report.data.channels.map((entry, index) => (
                        <Cell key={entry.channel} fill={chartColor(index)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </div>
          </Card>
          <RankedList
            title="Traffic sources"
            empty={connected ? "No sessions in this period." : "Appears after you connect."}
            rows={(report.data?.sources ?? []).map((row) => {
              const [source, medium] = row.source.split(" / ");
              return {
                key: row.source,
                value: row.sessions,
                label: (
                  <span className="flex min-w-0 items-center gap-2">
                    <SourceIcon source={source ?? ""} />
                    <span className="truncate">
                      <span className="font-medium text-ink">{source}</span>
                      {medium && <span className="text-dim"> · {medium}</span>}
                    </span>
                  </span>
                ),
              };
            })}
          />
          <RankedList
            title="Countries"
            empty={connected ? "No visitors in this period." : "Appears after you connect."}
            rows={(report.data?.countries ?? []).map((row) => ({
              key: row.country,
              value: row.users,
              label: (
                <span className="flex min-w-0 items-center gap-2">
                  {flagEmoji(row.code) ? (
                    <span className="shrink-0 text-[15px] leading-none">{flagEmoji(row.code)}</span>
                  ) : (
                    <Globe className="size-4 shrink-0 text-faint" />
                  )}
                  <span className="truncate text-ink">{row.country}</span>
                </span>
              ),
            }))}
          />
          <RankedList
            title="Devices"
            empty={connected ? "No visitors in this period." : "Appears after you connect."}
            rows={(report.data?.devices ?? []).map((row) => ({
              key: row.device,
              value: row.users,
              label: <span className="capitalize text-ink">{row.device}</span>,
            }))}
          />
        </div>
      )}
    </>
  );
}

/** Card of rows with a faint proportional bar behind each (sources, countries, devices). */
function RankedList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { key: string; label: React.ReactNode; value: number }[];
  empty: string;
}) {
  const max = rows[0]?.value || 1;
  return (
    <Card>
      <CardHeader title={title} divided />
      {rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-[13px] text-faint">{empty}</p>
      ) : (
        <ul>
          {rows.map((row, index) => (
            <li
              key={row.key}
              className={cn(
                "relative flex items-center justify-between gap-4 px-6 py-2.5 text-[13px]",
                index > 0 && "border-t border-divider"
              )}
            >
              <span
                className="absolute inset-y-1 left-2 rounded bg-coral-soft"
                style={{ width: `${Math.max(2, (row.value / max) * 96)}%` }}
                aria-hidden
              />
              <span className="relative min-w-0">{row.label}</span>
              <span className="relative shrink-0 tabular-nums text-dim">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
