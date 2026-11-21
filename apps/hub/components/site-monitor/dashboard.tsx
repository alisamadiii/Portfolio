"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { ArrowDown, ArrowUp, Lock, ShieldCheck } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useTRPC } from "@workspace/trpc/client";
import { formatPct, shortDuration } from "@workspace/trpc/lib/sitewatch-shared";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { cn } from "@workspace/ui/lib/utils";

import { Badge } from "@/components/ds/ui/badge";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { useProjectId } from "@/hooks/use-repo";

import type { MonitoredOverview } from "./site-monitor-page";

const chartConfig = { ms: { label: "Response time", color: "var(--color-info)" } } satisfies ChartConfig;

const ago = (iso: string | null) => (iso ? formatDistanceToNowStrict(parseISO(iso), { addSuffix: true }) : "—");
const day = (iso: string | null) => (iso ? format(parseISO(iso), "MMM d, yyyy") : "—");

/** Dashboard tab: status, last check, 24h strip, uptime %, response times, SSL/domain, downtime. */
export function SiteMonitorDashboard({ overview }: { overview: MonitoredOverview }) {
  const { site, uptime } = overview;
  const down = site.uptimeStatus === "down";
  const since = down ? uptime.downSince : uptime.upSince;
  // Render clock for "up for" / "days left" (stable across re-renders).
  const [now] = useState(() => Date.now());

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr]">
          <Stat label="Current status">
            {site.uptimeStatus === "unknown" ? (
              <span className="text-2xl font-semibold text-faint">—</span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-2xl font-semibold",
                  down ? "text-danger" : "text-success-text"
                )}
              >
                {down ? <ArrowDown className="size-5" aria-hidden /> : <ArrowUp className="size-5" aria-hidden />}
                {down ? "Down" : "Up"}
              </span>
            )}
            <span className="text-[13px] text-dim">
              {since ? `${down ? "Down" : "Up"} for ${shortDuration(now - parseISO(since).getTime())}` : "Waiting for the first check"}
            </span>
          </Stat>
          <Stat label="Last check">
            <span className={cn("text-2xl font-semibold", !uptime.lastCheckAt && "text-faint")}>
              {ago(uptime.lastCheckAt)}
            </span>
            <span className="text-[13px] text-dim">Checked every {site.pingEveryMinutes}m</span>
          </Stat>
          <Stat
            label="Last 24 hours"
            aside={
              <span className={cn("text-[13px] font-semibold", uptime.pct24h == null ? "text-faint" : "text-success-text")}>
                {formatPct(uptime.pct24h)}
              </span>
            }
            className="sm:col-span-2 xl:col-span-1"
          >
            <div className="flex h-9 items-stretch gap-[2px]" aria-label="Uptime over the last 24 hours">
              {uptime.bar24h.map((slot) => (
                <span
                  key={slot.from}
                  title={`${format(slot.from, "MMM d, h:mm a")}: ${slot.state === "none" ? "no data" : slot.state}`}
                  className={cn(
                    "flex-1 rounded-[2px]",
                    slot.state === "up" && "bg-success",
                    slot.state === "down" && "bg-danger",
                    slot.state === "none" && "bg-divider"
                  )}
                />
              ))}
            </div>
          </Stat>
        </div>

        <Card>
          <CardHeader title="Uptime" />
          <div className="grid gap-4 px-6 pb-5 sm:grid-cols-3">
            {(
              [
                ["Last 24 hours", uptime.pct24h],
                ["Last 7 days", uptime.pct7d],
                ["Last 30 days", uptime.pct30d],
              ] as const
            ).map(([label, pct]) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-[13px] text-dim">{label}</span>
                <span className={cn("text-2xl font-semibold", pct == null ? "text-faint" : "text-success-text")}>
                  {formatPct(pct)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Response time"
            action={
              <span className="text-[13px] text-dim">
                {uptime.avgResponseMs != null ? `avg ${uptime.avgResponseMs} ms, last 30 days` : "Last 30 days"}
              </span>
            }
          />
          <div className="px-4 pb-4">
            {uptime.series.length === 0 ? (
              <p className="px-2 py-10 text-center text-[13px] text-dim">No response times yet.</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[240px] w-full">
                <AreaChart data={uptime.series} margin={{ left: 0, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="site-monitor-ms" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-ms)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-ms)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="t"
                    type="number"
                    scale="time"
                    domain={["dataMin", "dataMax"]}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={32}
                    tickFormatter={(t: number) => format(t, "MMM d")}
                  />
                  <YAxis
                    width={52}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}ms`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => {
                          const t = payload?.[0]?.payload?.t;
                          return typeof t === "number" ? format(t, "EEE, MMM d, h a") : "";
                        }}
                        formatter={(value) => `${value} ms`}
                      />
                    }
                  />
                  <Area
                    dataKey="ms"
                    type="monotone"
                    fill="url(#site-monitor-ms)"
                    stroke="var(--color-ms)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
        </Card>

        <Endpoints />
      </div>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Domain and SSL" />
          <div className="flex flex-col gap-4 px-6 pb-5">
            <Expiry label="SSL certificate valid until" iso={site.sslValidTo} now={now} icon={<ShieldCheck className="size-4" />} />
            <Expiry label="Domain registered until" iso={site.domainExpiry} now={now} icon={<Lock className="size-4" />} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent downtime" />
          <div className="flex flex-col gap-3 px-6 pb-5">
            {uptime.incidents.length === 0 ? (
              <p className="text-[13px] text-dim">No outages recorded.</p>
            ) : (
              uptime.incidents.map((i) => (
                <div key={i.id} className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-[13px] font-medium">
                    {format(parseISO(i.firstSeenAt), "MMM d, h:mm a")}
                    {!i.resolvedAt && <Badge tone="coral">Ongoing</Badge>}
                  </span>
                  <span className="text-[13px] text-dim">
                    {i.resolvedAt
                      ? `Down for ${shortDuration(parseISO(i.resolvedAt).getTime() - parseISO(i.firstSeenAt).getTime())}`
                      : i.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  aside,
  className,
  children,
}: {
  label: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("flex flex-col gap-2 px-5 py-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-dim">{label}</span>
        {aside}
      </div>
      {children}
    </Card>
  );
}

function Expiry({ label, iso, icon, now }: { label: string; iso: string | null; icon: React.ReactNode; now: number }) {
  const daysLeft = iso ? Math.floor((parseISO(iso).getTime() - now) / 86_400_000) : null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] text-dim">{label}</span>
      <span className={cn("flex items-center gap-2 text-sm font-medium", !iso && "text-faint")}>
        <span className="text-dim">{icon}</span>
        {day(iso)}
        {daysLeft != null && daysLeft < 30 && (
          <Badge tone={daysLeft < 7 ? "coral" : "warning"}>
            {daysLeft < 0 ? "Expired" : `${daysLeft} days left`}
          </Badge>
        )}
      </span>
    </div>
  );
}

/** API / health routes sitewatch checks on every crawl. Hidden when there are none. */
function Endpoints() {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const endpoints = useQuery(trpc.siteMonitor.endpoints.queryOptions({ projectId }));
  if (!endpoints.data?.length) return null;

  return (
    <Card>
      <CardHeader title="Endpoints" divided />
      <div className="flex flex-col">
        {endpoints.data.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-4 border-b border-divider px-6 py-3 last:border-b-0">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-medium">{e.name}</span>
              <span className="truncate text-[13px] text-dim">
                {e.method} {e.url}
              </span>
              {e.downReason && <span className="text-[13px] text-danger">{e.downReason}</span>}
            </div>
            <Badge tone={e.status === "up" ? "success" : e.status === "down" ? "coral" : "neutral"} dot>
              {e.status === "up" ? "Up" : e.status === "down" ? "Down" : "Pending"}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
