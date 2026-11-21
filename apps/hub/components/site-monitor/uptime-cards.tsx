"use client";

import { useState } from "react";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";

import { formatPct, shortDuration, type SitewatchSite, type SitewatchUptime } from "@workspace/trpc/lib/sitewatch-shared";
import { cn } from "@workspace/ui/lib/utils";

import { Card } from "@/components/ds/ui/card";

const ago = (iso: string | null) => (iso ? formatDistanceToNowStrict(parseISO(iso), { addSuffix: true }) : "—");

/** Current status, last check and the 24h strip. Site Monitor dashboard and Home. */
export function UptimeCards({ site, uptime }: { site: SitewatchSite; uptime: SitewatchUptime }) {
  const down = site.uptimeStatus === "down";
  const since = down ? uptime.downSince : uptime.upSince;
  // Render clock for "up for" (stable across re-renders).
  const [now] = useState(() => Date.now());

  return (
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
  );
}

/**
 * Compact status / last check / 24h strip for Home's website card. Links to
 * Site Monitor.
 */
export function UptimeSummary({ site, uptime }: { site: SitewatchSite; uptime: SitewatchUptime }) {
  const down = site.uptimeStatus === "down";
  const since = down ? uptime.downSince : uptime.upSince;
  const [now] = useState(() => Date.now());

  return (
    <Link
      href="/site-monitor"
      className="grid gap-4 rounded-inner border border-line px-4 py-3 transition-colors hover:bg-sidebar sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:gap-6"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-dim">Status</span>
        {site.uptimeStatus === "unknown" ? (
          <span className="text-sm font-semibold text-faint">—</span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-sm font-semibold",
              down ? "text-danger" : "text-success-text"
            )}
          >
            {down ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUp className="size-3.5" aria-hidden />}
            {down ? "Down" : "Up"}
            {since && (
              <span className="font-normal text-dim">for {shortDuration(now - parseISO(since).getTime())}</span>
            )}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-dim">Last check</span>
        <span className={cn("text-sm font-semibold", !uptime.lastCheckAt && "text-faint")}>{ago(uptime.lastCheckAt)}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center justify-between gap-2 text-xs text-dim">
          Last 24 hours
          <span className={cn("font-semibold", uptime.pct24h == null ? "text-faint" : "text-success-text")}>
            {formatPct(uptime.pct24h)}
          </span>
        </span>
        <span className="flex h-5 items-stretch gap-px" aria-label="Uptime over the last 24 hours">
          {uptime.bar24h.map((slot) => (
            <span
              key={slot.from}
              className={cn(
                "flex-1 rounded-[1px]",
                slot.state === "up" && "bg-success",
                slot.state === "down" && "bg-danger",
                slot.state === "none" && "bg-divider"
              )}
            />
          ))}
        </span>
      </div>
    </Link>
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
