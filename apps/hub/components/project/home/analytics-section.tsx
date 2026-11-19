"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

import { GoogleAnalyticsLogo } from "@/components/ds/brand-logos";
import { ButtonLink } from "@/components/ds/ui/button";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";

import { SectionCard } from "./section-card";
import { TrendChart } from "./trend-chart";
import type { HomeRange } from "./use-home-range";

const SERIES = [
  { key: "sessions", label: "Sessions", color: "var(--chart-1)" },
  { key: "activeUsers", label: "Visitors", color: "var(--chart-3)" },
] as const;

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

/** Google Analytics on Home: the four headline numbers, the traffic line and the five busiest pages. */
export function AnalyticsSection({ projectId, range }: { projectId: string; range: HomeRange }) {
  const trpc = useTRPC();
  const status = useQuery(trpc.analytics.status.queryOptions({ projectId }, { staleTime: 60_000 }));
  const connected = status.data?.connected === true;
  const report = useQuery(
    trpc.analytics.report.queryOptions(
      { projectId, range },
      { enabled: connected, retry: false, placeholderData: keepPreviousData, staleTime: 5 * 60_000 }
    )
  );
  const errorCode = (report.error as { data?: { code?: string } } | null)?.data?.code;
  const notInPlan = report.isError && errorCode === "PAYMENT_REQUIRED";
  const k = report.data?.kpis;
  const none = !k;
  const pages = report.data?.topPages.slice(0, 5) ?? [];
  const maxViews = pages[0]?.views || 1;

  return (
    <SectionCard
      title="Analytics"
      icon={<GoogleAnalyticsLogo className="size-4" />}
      brand
      href="/analytics"
      linkLabel="Open Analytics"
      loading={status.isPending || (connected && report.isPending)}
      stale={report.isPlaceholderData}
      className="xl:col-span-2"
    >
      {status.data && !connected ? (
        <EmptyState
          icon={<BarChart3 className="size-5" />}
          title="Google Analytics isn't connected"
          text="Pick this site's Analytics property and your visitors show up here."
          action={<ButtonLink variant="primary" size="sm" href="/analytics">Connect</ButtonLink>}
        />
      ) : connected && notInPlan ? (
        <EmptyState
          icon={<BarChart3 className="size-5" />}
          title="Analytics isn't in this site's plan"
          text="Upgrade the site's plan to see its traffic here."
          action={<ButtonLink variant="dark" size="sm" href="/billing">View plan</ButtonLink>}
        />
      ) : connected && report.isError ? (
        <EmptyState
          icon={<BarChart3 className="size-5" />}
          title="Google Analytics needs to be reconnected"
          text="Access to the connected Google account expired or was revoked."
          action={<ButtonLink variant="primary" size="sm" href="/analytics">Reconnect</ButtonLink>}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <KpiGrid
              bare
              dim={none}
              items={[
                { label: "Visitors", value: none ? "—" : String(k.activeUsers) },
                { label: "Sessions", value: none ? "—" : String(k.sessions) },
                { label: "Pages per session", value: none || !k.sessions ? "—" : (k.screenPageViews / k.sessions).toFixed(1) },
                { label: "Avg. time on site", value: none ? "—" : formatDuration(k.averageSessionDuration) },
              ]}
            />
            {report.data ? (
              <TrendChart data={report.data.timeseries} series={SERIES} />
            ) : (
              <div className="h-[200px] rounded-inner border border-dashed border-line" />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-[13px] font-medium text-dim">Top pages</span>
            {pages.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-faint">No page views in this period.</p>
            ) : (
              <ul className="flex flex-col">
                {pages.map((p, i) => (
                  <li
                    key={p.path}
                    className={"relative flex items-center justify-between gap-4 py-2.5 text-[13px]" + (i > 0 ? " border-t border-divider" : "")}
                  >
                    <span
                      className="absolute inset-y-1 left-0 rounded bg-coral-soft"
                      style={{ width: `${Math.max(2, (p.views / maxViews) * 96)}%` }}
                      aria-hidden
                    />
                    <span className="relative min-w-0 truncate px-2 text-ink">{p.path}</span>
                    <span className="relative shrink-0 tabular-nums text-dim">{p.views}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
