"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Label as RechartsLabel,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
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
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { authClient } from "@workspace/auth/auth-client";

import { Globe } from "@/components/icon";
import { ChartMark } from "@/components/analytics/chart-mark";

const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "28d", label: "Last 28 days" },
  { value: "90d", label: "Last 90 days" },
] as const;
type RangeValue = (typeof RANGES)[number]["value"];

const trafficConfig = {
  activeUsers: { label: "Active users", color: "var(--chart-1)" },
  sessions: { label: "Sessions", color: "var(--chart-3)" },
} satisfies ChartConfig;

const channelsConfig = {
  sessions: { label: "Sessions", color: "var(--chart-2)" },
} satisfies ChartConfig;

// Cycle the five theme chart colors across arbitrary category counts.
const chartColor = (index: number) => `var(--chart-${(index % 5) + 1})`;

// Bare GA source names (no dot) → favicon domain. Dotted sources are used as-is.
const SOURCE_DOMAINS: Record<string, string> = {
  google: "google.com",
  bing: "bing.com",
  yahoo: "yahoo.com",
  duckduckgo: "duckduckgo.com",
  instagram: "instagram.com",
  facebook: "facebook.com",
  twitter: "x.com",
  x: "x.com",
  linkedin: "linkedin.com",
  youtube: "youtube.com",
  tiktok: "tiktok.com",
  pinterest: "pinterest.com",
  reddit: "reddit.com",
  resend: "resend.com",
  usesend: "usesend.com",
};

const sourceDomain = (source: string): string | null => {
  const key = source.toLowerCase();
  if (SOURCE_DOMAINS[key]) return SOURCE_DOMAINS[key];
  return key.includes(".") ? key : null;
};

/** Favicon for a traffic source, globe fallback for (direct) & unknowns. */
const SourceIcon = ({ source }: { source: string }) => {
  const [failed, setFailed] = useState(false);
  const domain = sourceDomain(source);
  if (!domain || failed)
    return <Globe className="text-muted-foreground size-4 shrink-0" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      className="size-4 shrink-0 rounded-sm"
      onError={() => setFailed(true)}
    />
  );
};

// "US" → 🇺🇸 (regional-indicator pair). Null for "(not set)" etc.
const flagEmoji = (code: string): string | null =>
  /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(
        ...[...code].map((char) => 0x1f1a5 + char.charCodeAt(0))
      )
    : null;

/**
 * Donut + readable breakdown: center total, and a row per slice with its
 * color, count, and share — the legend-only version hid the actual numbers.
 */
const DonutWithList = ({
  data,
  colorStep = 1,
}: {
  data: { name: string; value: number }[];
  colorStep?: number;
}) => {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  return (
    <div className="flex items-center gap-2">
      <ChartContainer
        config={{} satisfies ChartConfig}
        className="h-[200px] min-w-0 flex-1"
      >
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent nameKey="name" hideLabel />}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            strokeWidth={4}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={chartColor(index * colorStep)} />
            ))}
            <RechartsLabel
              content={({ viewBox }) =>
                viewBox && "cx" in viewBox && "cy" in viewBox ? (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan className="fill-foreground text-[22px] font-extrabold">
                      {total}
                    </tspan>
                  </text>
                ) : null
              }
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="flex w-[45%] shrink-0 flex-col gap-2.5">
        {data.map((entry, index) => (
          <li key={entry.name} className="flex items-center gap-2 text-[13px]">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: chartColor(index * colorStep) }}
            />
            <span className="truncate capitalize">{entry.name}</span>
            <span className="text-muted-foreground ml-auto shrink-0 tabular-nums">
              {entry.value} ·{" "}
              {total ? Math.round((entry.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const PanelHeading = () => (
  <div>
    <h2 className="text-[22px] font-extrabold tracking-tight">Analytics</h2>
    <p className="text-muted-foreground mt-1 text-[14px]">
      Traffic from your website&apos;s Google Analytics property — visitors,
      sessions, and your most-viewed pages.
    </p>
  </div>
);

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

export function AnalyticsPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { config } = useConfig();

  const owner = config?.owner;
  const repo = config?.repo;
  const hasProject = !!owner && !!repo;
  const scope = { owner: owner ?? "", repo: repo ?? "" };

  const [range, setRange] = useState<RangeValue>("28d");
  const [pickedProperty, setPickedProperty] = useState("");

  // Gate: property + connector stored on the project → dashboard; else setup.
  const { data: status, isLoading: statusLoading } = useQuery(
    trpc.analytics.status.queryOptions(scope, { enabled: hasProject })
  );
  const connected = hasProject && status?.connected === true;

  // Property picker source — only fetched while unconnected. Fails with
  // PRECONDITION_FAILED until the caller has linked Google with the GA scope,
  // which is exactly the signal to show the Connect button instead.
  const propertiesQuery = useQuery(
    trpc.analytics.properties.queryOptions(scope, {
      enabled: hasProject && status?.connected === false,
      retry: false,
    })
  );

  const connect = useMutation(
    trpc.analytics.connect.mutationOptions({
      onSuccess: () => {
        toast.success("Google Analytics connected");
        queryClient.invalidateQueries({
          queryKey: trpc.analytics.status.queryOptions(scope).queryKey,
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const disconnect = useMutation(
    trpc.analytics.disconnect.mutationOptions({
      onSuccess: () => {
        setPickedProperty("");
        queryClient.invalidateQueries({
          queryKey: trpc.analytics.status.queryOptions(scope).queryKey,
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const report = useQuery(
    trpc.analytics.report.queryOptions(
      { ...scope, range },
      { enabled: connected, retry: false }
    )
  );

  const chartData = useMemo(
    () => report.data?.timeseries ?? [],
    [report.data]
  );

  // Send the user through Google consent with the GA read scope, then back
  // to this tab. Better Auth links the Google account and stores the tokens.
  const linkGoogle = async () => {
    const { error } = await authClient.linkSocial({
      provider: "google",
      scopes: [GA_SCOPE],
      callbackURL: window.location.href,
    });
    if (error) toast.error(error.message ?? "Could not start Google sign-in");
  };

  if (!owner || !repo) return null;

  if (statusLoading) {
    return (
      <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
        <PanelHeading />
        <div className="grid grid-cols-4 gap-3">
          <Skeleton className="h-[86px] rounded-lg" />
          <Skeleton className="h-[86px] rounded-lg" />
          <Skeleton className="h-[86px] rounded-lg" />
          <Skeleton className="h-[86px] rounded-lg" />
        </div>
        <Skeleton className="h-[240px] w-full rounded-lg" />
      </div>
    );
  }

  if (!connected) {
    const properties = propertiesQuery.data ?? [];
    const needsLink = propertiesQuery.isError;
    return (
      <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
        <PanelHeading />
        <div className="rounded-lg border border-dashed px-6 py-16 text-center">
          <div className="bg-status-neutral-bg border-status-neutral/50 text-status-neutral mx-auto grid size-14 place-items-center rounded-2xl border">
            <ChartMark className="size-6" />
          </div>
          <h3 className="mt-5 text-[20px] font-extrabold tracking-tight">
            Connect Google Analytics
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[14px]">
            Sign in with the Google account that has access to this
            website&apos;s Google Analytics, and your traffic will show up
            right here.
          </p>
          {propertiesQuery.isLoading ? (
            <Skeleton className="mx-auto mt-6 h-9 w-72 rounded-md" />
          ) : needsLink ? (
            <Button type="button" className="mt-6" onClick={linkGoogle}>
              Sign in with Google
            </Button>
          ) : properties.length === 0 ? (
            <p className="text-muted-foreground mx-auto mt-6 max-w-[420px] text-[13px]">
              Your Google account has no Analytics properties. Sign in with a
              different account, or create a property in Google Analytics
              first.
            </p>
          ) : (
            <div className="mx-auto mt-6 flex max-w-[420px] items-center justify-center gap-2">
              <Select
                value={pickedProperty}
                onValueChange={(value) => setPickedProperty(value ?? "")}
              >
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Choose a property…" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem
                      key={property.propertyId}
                      value={property.propertyId}
                    >
                      {property.displayName}
                      {property.account ? ` — ${property.account}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                disabled={!pickedProperty || connect.isPending}
                onClick={() =>
                  connect.mutate({ ...scope, propertyId: pickedProperty })
                }
              >
                Connect
              </Button>
            </div>
          )}
          {needsLink && (
            <p className="text-muted-foreground mx-auto mt-4 max-w-[420px] text-[13px]">
              We only ask for read-only access to your Analytics data — we can
              never change anything in your Google account.
            </p>
          )}
        </div>
      </div>
    );
  }

  const kpis = report.data?.kpis;
  const reconnectNeeded = report.isError;

  return (
    // Dashboard runs full-bleed — analytics wants room; setup/loading states
    // above keep the centered max-width.
    <div className="w-full max-w-none space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <PanelHeading />
        <div className="flex items-center gap-2">
          <Select
            value={range}
            onValueChange={(value) => setRange(value as RangeValue)}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate(scope)}
          >
            Disconnect
          </Button>
        </div>
      </div>

      {reconnectNeeded ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <h3 className="text-[18px] font-extrabold tracking-tight">
            Google Analytics needs to be reconnected
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[14px]">
            Access to the connected Google account expired or was revoked.
            Sign in again to keep the data flowing.
          </p>
          <Button type="button" className="mt-5" onClick={linkGoogle}>
            Sign in with Google
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {(
              [
                ["Active users", kpis ? String(kpis.activeUsers) : null],
                ["New users", kpis ? String(kpis.newUsers) : null],
                ["Sessions", kpis ? String(kpis.sessions) : null],
                ["Page views", kpis ? String(kpis.screenPageViews) : null],
                [
                  "Avg. session",
                  kpis ? formatDuration(kpis.averageSessionDuration) : null,
                ],
                [
                  "Engagement",
                  kpis ? `${Math.round(kpis.engagementRate * 100)}%` : null,
                ],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-card rounded-lg border p-4">
                <p className="text-muted-foreground text-[12px] font-medium uppercase tracking-wide">
                  {label}
                </p>
                {value === null ? (
                  <Skeleton className="mt-2 h-7 w-16 rounded" />
                ) : (
                  <p className="mt-1 text-[24px] font-extrabold tracking-tight">
                    {value}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground mb-3 text-[12px] font-medium uppercase tracking-wide">
              Visitors over time
            </p>
            {report.isLoading ? (
              <Skeleton className="h-[280px] w-full rounded" />
            ) : (
              <ChartContainer
                config={trafficConfig}
                className="h-[280px] w-full"
              >
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-activeUsers)"
                        stopOpacity={0.6}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-activeUsers)"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                    <linearGradient
                      id="fillSessions"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-sessions)"
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-sessions)"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: string) =>
                      value ? format(parseISO(value), "MMM d") : ""
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) =>
                          typeof value === "string" && value
                            ? format(parseISO(value), "MMM d, yyyy")
                            : ""
                        }
                      />
                    }
                  />
                  <Area
                    dataKey="sessions"
                    type="monotone"
                    fill="url(#fillSessions)"
                    stroke="var(--color-sessions)"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="activeUsers"
                    type="monotone"
                    fill="url(#fillUsers)"
                    stroke="var(--color-activeUsers)"
                    strokeWidth={2}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <div className="bg-card rounded-lg border p-4">
              <p className="text-muted-foreground mb-3 text-[12px] font-medium uppercase tracking-wide">
                Where visitors come from
              </p>
              {report.isLoading ? (
                <Skeleton className="h-[220px] w-full rounded" />
              ) : (report.data?.channels.length ?? 0) === 0 ? (
                <p className="text-muted-foreground py-16 text-center text-[14px]">
                  No sessions in this period.
                </p>
              ) : (
                <ChartContainer
                  config={channelsConfig}
                  className="h-[220px] w-full"
                >
                  <BarChart
                    data={report.data!.channels}
                    layout="vertical"
                    margin={{ left: 8 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="channel"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={90}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar dataKey="sessions" radius={4}>
                      {report.data!.channels.map((entry, index) => (
                        <Cell key={entry.channel} fill={chartColor(index)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </div>

            <div className="bg-card rounded-lg border p-4">
              <p className="text-muted-foreground mb-3 text-[12px] font-medium uppercase tracking-wide">
                Devices
              </p>
              {report.isLoading ? (
                <Skeleton className="h-[220px] w-full rounded" />
              ) : (report.data?.devices.length ?? 0) === 0 ? (
                <p className="text-muted-foreground py-16 text-center text-[14px]">
                  No visitors in this period.
                </p>
              ) : (
                <DonutWithList
                  data={report.data!.devices.map((entry) => ({
                    name: entry.device,
                    value: entry.users,
                  }))}
                  colorStep={2}
                />
              )}
            </div>

            <div className="bg-card rounded-lg border p-4">
              <p className="text-muted-foreground mb-3 text-[12px] font-medium uppercase tracking-wide">
                New vs returning
              </p>
              {report.isLoading ? (
                <Skeleton className="h-[220px] w-full rounded" />
              ) : (report.data?.newVsReturning.length ?? 0) === 0 ? (
                <p className="text-muted-foreground py-16 text-center text-[14px]">
                  No visitors in this period.
                </p>
              ) : (
                <DonutWithList
                  data={report.data!.newVsReturning.map((entry) => ({
                    name: entry.type,
                    value: entry.users,
                  }))}
                  colorStep={3}
                />
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="bg-card rounded-lg border">
              <p className="text-muted-foreground border-b p-4 pb-3 text-[12px] font-medium uppercase tracking-wide">
                Traffic sources
              </p>
              {report.isLoading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-full rounded" />
                </div>
              ) : (report.data?.sources.length ?? 0) === 0 ? (
                <p className="text-muted-foreground p-4 text-[14px]">
                  No sessions in this period.
                </p>
              ) : (
                <ul>
                  {report.data!.sources.map((row, index) => {
                    const max = report.data!.sources[0]?.sessions || 1;
                    // "instagram / referral" → bold source, muted medium.
                    const [source, medium] = row.source.split(" / ");
                    return (
                      <li
                        key={row.source}
                        className={cn(
                          "relative flex items-center justify-between gap-4 px-4 py-2.5 text-[14px]",
                          index > 0 && "border-t"
                        )}
                      >
                        <span
                          className="absolute inset-y-1 left-1 rounded-[4px] opacity-[0.12]"
                          style={{
                            width: `${Math.max(2, (row.sessions / max) * 97)}%`,
                            background: chartColor(1),
                          }}
                        />
                        <span className="relative flex min-w-0 items-center gap-2">
                          <SourceIcon source={source ?? ""} />
                          <span className="truncate">
                            <span className="font-medium">{source}</span>
                            {medium && (
                              <span className="text-muted-foreground">
                                {" "}
                                · {medium}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="text-muted-foreground relative shrink-0 tabular-nums">
                          {row.sessions}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="bg-card rounded-lg border">
              <p className="text-muted-foreground border-b p-4 pb-3 text-[12px] font-medium uppercase tracking-wide">
                Countries
              </p>
              {report.isLoading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-full rounded" />
                </div>
              ) : (report.data?.countries.length ?? 0) === 0 ? (
                <p className="text-muted-foreground p-4 text-[14px]">
                  No visitors in this period.
                </p>
              ) : (
                <ul>
                  {report.data!.countries.map((row, index) => {
                    const max = report.data!.countries[0]?.users || 1;
                    return (
                      <li
                        key={row.country}
                        className={cn(
                          "relative flex items-center justify-between gap-4 px-4 py-2.5 text-[14px]",
                          index > 0 && "border-t"
                        )}
                      >
                        <span
                          className="absolute inset-y-1 left-1 rounded-[4px] opacity-[0.12]"
                          style={{
                            width: `${Math.max(2, (row.users / max) * 97)}%`,
                            background: chartColor(2),
                          }}
                        />
                        <span className="relative flex min-w-0 items-center gap-2">
                          {flagEmoji(row.code) ? (
                            <span className="shrink-0 text-[15px] leading-none">
                              {flagEmoji(row.code)}
                            </span>
                          ) : (
                            <Globe className="text-muted-foreground size-4 shrink-0" />
                          )}
                          <span className="truncate">{row.country}</span>
                        </span>
                        <span className="text-muted-foreground relative shrink-0 tabular-nums">
                          {row.users}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-card rounded-lg border">
            <p className="text-muted-foreground border-b p-4 pb-3 text-[12px] font-medium uppercase tracking-wide">
              Top pages
            </p>
            {report.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-full rounded" />
              </div>
            ) : (report.data?.topPages.length ?? 0) === 0 ? (
              <p className="text-muted-foreground p-4 text-[14px]">
                No page views in this period.
              </p>
            ) : (
              <ul>
                {report.data!.topPages.map((page, index) => {
                  const max = report.data!.topPages[0]?.views || 1;
                  return (
                    <li
                      key={page.path}
                      className={cn(
                        "relative flex items-center justify-between gap-4 px-4 py-2.5 text-[14px]",
                        index > 0 && "border-t"
                      )}
                    >
                      <span
                        className="absolute inset-y-1 left-1 rounded-[4px] opacity-[0.12]"
                        style={{
                          width: `${Math.max(2, (page.views / max) * 97)}%`,
                          background: chartColor(0),
                        }}
                      />
                      <span className="relative truncate">{page.path}</span>
                      <span className="text-muted-foreground relative shrink-0 tabular-nums">
                        {page.views}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
