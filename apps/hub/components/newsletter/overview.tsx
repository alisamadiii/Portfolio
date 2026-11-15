"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Globe, Mail, Sparkles, Users } from "lucide-react";
import { Area, AreaChart, XAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { useTRPC } from "@workspace/trpc/client";

import { Badge } from "@/components/ds/ui/badge";
import { Button, buttonClass } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { EmptyState, IconTile, KpiGrid } from "@/components/ds/ui/misc";

import { CampaignTable } from "./campaigns";
import type { NewsletterTab } from "./newsletter-page";
import { QueryError } from "./query-error";
import { pct, useNewsletter } from "./use-newsletter";

const chartConfig = {
  delivered: { label: "Delivered", color: "var(--chart-3)" },
  opened: { label: "Opened", color: "var(--chart-1)" },
  clicked: { label: "Clicked", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function OverviewSection({ go }: { go: (tab: NewsletterTab) => void }) {
  const trpc = useTRPC();
  const { projectId } = useNewsletter();
  const [days, setDays] = useState<7 | 30>(30);

  const overview = useQuery(trpc.newsletter.overview.queryOptions({ projectId }));
  const analytics = useQuery(
    trpc.newsletter.analytics.queryOptions({ projectId, days }, { placeholderData: keepPreviousData })
  );
  const recent = useQuery(trpc.newsletter.campaigns.list.queryOptions({ projectId, page: 1 }));

  const o = overview.data;
  const domain = o?.domain;
  const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString());

  const failed = overview.error ?? analytics.error ?? recent.error;
  return (
    <>
      <QueryError
        error={failed}
        onRetry={() => {
          void overview.refetch();
          void analytics.refetch();
          void recent.refetch();
        }}
      />
      {o && (!domain || domain.status !== "SUCCESS") && (
        <Card className="flex flex-wrap items-center gap-4 px-6 py-5">
          <IconTile>
            <Globe className="size-5" strokeWidth={1.8} />
          </IconTile>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[15px] font-semibold">
              {domain ? `Verify ${domain.name} to start sending` : "Add your domain to start sending"}
            </span>
            <p className="text-[13px] text-dim">
              Newsletters go out from your own address, like news@yourbusiness.com, so they land in
              the inbox and carry your name.
            </p>
          </div>
          <Button variant="primary" onClick={() => go("domain")}>
            {domain ? "Finish setup" : "Add domain"}
          </Button>
        </Card>
      )}

      <KpiGrid
        items={[
          { label: "Subscribers", value: n(o?.subscribers) },
          { label: "Campaigns sent", value: n(o?.campaignsSent) },
          { label: "Open rate", value: o ? pct(o.openRate) : "—", sub: "Last 30 days" },
          { label: "Click rate", value: o ? pct(o.clickRate) : "—", sub: "Last 30 days" },
        ]}
      />

      <Card>
        <CardHeader
          title="Email activity"
          action={
            <SegmentedTabs
              label="Range"
              value={String(days)}
              onChange={(id) => setDays(Number(id) as 7 | 30)}
              items={[
                { id: "7", label: "7 days" },
                { id: "30", label: "30 days" },
              ]}
            />
          }
        />
        <div className="px-6 pb-6">
          {analytics.isLoading ? (
            <Skeleton className="h-[220px] w-full rounded-inner" />
          ) : !analytics.data ? (
            <div className="flex h-[180px] items-center justify-center border-y border-divider text-[13px] text-faint">
              Activity appears after your first campaign
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge tone="neutral">Sent {analytics.data.totalCounts.sent.toLocaleString()}</Badge>
                <Badge tone="neutral">Bounced {analytics.data.totalCounts.bounced.toLocaleString()}</Badge>
                <Badge tone="neutral">
                  Spam complaints {analytics.data.totalCounts.complained.toLocaleString()}
                </Badge>
                <Badge tone={analytics.data.reputation.bounceRate > 5 ? "warning" : "success"}>
                  Bounce rate {analytics.data.reputation.bounceRate.toFixed(1)}%
                </Badge>
              </div>
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <AreaChart data={analytics.data.result}>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => (v ? format(parseISO(v), "MMM d") : "")}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(v) =>
                          typeof v === "string" && v ? format(parseISO(v), "MMM d, yyyy") : ""
                        }
                      />
                    }
                  />
                  <Area dataKey="delivered" type="monotone" fill="var(--color-delivered)" fillOpacity={0.12} stroke="var(--color-delivered)" strokeWidth={2} />
                  <Area dataKey="opened" type="monotone" fill="var(--color-opened)" fillOpacity={0.12} stroke="var(--color-opened)" strokeWidth={2} />
                  <Area dataKey="clicked" type="monotone" fill="var(--color-clicked)" fillOpacity={0.12} stroke="var(--color-clicked)" strokeWidth={2} />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Recent campaigns"
            divided
            action={
              recent.data?.campaigns.length ? (
                <button
                  type="button"
                  onClick={() => go("campaigns")}
                  className="text-[13px] font-medium text-coral-text hover:text-coral-deep"
                >
                  View all
                </button>
              ) : undefined
            }
          />
          <CampaignTable rows={(recent.data?.campaigns ?? []).slice(0, 5)} compact />
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <IconTile>
            <Users className="size-5" strokeWidth={1.8} />
          </IconTile>
          <h2 className="text-base font-semibold">Grow your list</h2>
          <p className="text-[13px] leading-normal text-dim">
            Add a signup form to your website so visitors can join your list, or bring in the
            customers you already have.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <RequestDialog defaultSubject="Newsletter: add signup form">
              <span className={buttonClass("outline", "sm")}>
                <Sparkles className="size-3.5 text-coral" />
                Add signup form
              </span>
            </RequestDialog>
            <Button size="sm" onClick={() => go("contacts")}>
              Import a list
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
