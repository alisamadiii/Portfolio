"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Inbox } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { ChannelBadge } from "@/components/agency/lead-channel";
import { formatMoney, LeadStatusBadge } from "@/components/agency/lead-status";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import { conversationHref } from "@/components/leads/inbox/conversation-href";
import { LeadNameCell } from "@/components/leads/leads-table";

import { SectionCard } from "./section-card";
import { fillDays, TrendChart } from "./trend-chart";
import type { RangeDays } from "./use-home-range";

type Lead = RouterOutputs["agency"]["leads"]["list"]["rows"][number];

const SERIES = [{ key: "leads", label: "Leads", color: "var(--chart-3)" }] as const;

/** Leads app on Home: how many came in, how many are waiting, what was won, and the latest five. */
export function LeadsSection({
  projectId,
  days,
  leadsRange,
}: {
  projectId: string;
  days: RangeDays;
  leadsRange: { from: string; to: string };
}) {
  const trpc = useTRPC();
  // A plan without Leads answers 402; the section then just reads "—"
  // (only handleCmsError opens the paywall, and nothing here calls it).
  const stats = useQuery(
    trpc.agency.leads.stats.queryOptions(
      { projectId, ...leadsRange },
      { placeholderData: keepPreviousData, retry: false, staleTime: 60_000 }
    )
  );
  const latest = useQuery(
    trpc.agency.leads.list.queryOptions({ projectId, page: 1, pageSize: 5 }, { retry: false, staleTime: 60_000 })
  );
  const s = stats.data;
  const none = !s;
  const chart = fillDays(days, (s?.byDay ?? []).map((d) => ({ date: d.date, leads: d.count })), ["leads"]);

  const columns: Column<Lead>[] = [
    { key: "name", header: "Lead", width: "minmax(180px, 2fr)", cell: (lead) => <LeadNameCell lead={lead} /> },
    { key: "channel", header: "Source", width: "minmax(110px, 1fr)", cell: (lead) => <ChannelBadge channel={lead.channel} /> },
    { key: "status", header: "Status", width: "minmax(100px, 1fr)", cell: (lead) => <LeadStatusBadge status={lead.status} /> },
    {
      key: "received",
      header: "Received",
      width: "minmax(110px, 1fr)",
      align: "end",
      cell: (lead) => (
        <span className="text-[13px] text-dim">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>
      ),
    },
  ];

  return (
    <SectionCard
      title="Leads"
      icon={<Inbox className="size-4" strokeWidth={1.8} />}
      href="/leads"
      linkLabel="Open Leads"
      loading={stats.isPending && latest.isPending}
      stale={stats.isPlaceholderData}
      className="xl:col-span-2"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <KpiGrid
            bare
            dim={none}
            items={[
              { label: "Leads", value: none ? "—" : String(s.leads) },
              { label: "Waiting for a reply", value: none ? "—" : String(s.counts.new ?? 0) },
              { label: "Won", value: none ? "—" : String(s.won) },
              { label: "Won revenue", value: none ? "—" : formatMoney(s.wonValueCents) },
            ]}
          />
          {none ? (
            <div className="flex h-[200px] items-center justify-center rounded-inner border border-dashed border-line text-[13px] text-faint">
              {stats.isError ? "Leads reporting isn't included in this site's plan." : "Chart appears once leads come in."}
            </div>
          ) : (
            <TrendChart data={chart} series={SERIES} />
          )}
        </div>
        <div className="min-w-0 overflow-hidden rounded-inner border border-line">
          <DataTable
            columns={columns}
            rows={latest.data?.rows ?? []}
            rowKey={(lead) => String(lead.id)}
            rowHref={(lead) => conversationHref("/leads", lead.id)}
            minWidth={520}
            empty={
              <EmptyState
                icon={<Inbox className="size-5" />}
                title="No leads yet"
                text="New form submissions and manual leads show up here."
              />
            }
          />
        </div>
      </div>
    </SectionCard>
  );
}
