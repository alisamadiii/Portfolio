"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, Inbox } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useTRPC } from "@workspace/trpc/client";
import { cn } from "@workspace/ui/lib/utils";

import { InstallSnippet } from "@/components/agency/install-snippet";
import { ChannelBadge } from "@/components/agency/lead-channel";
import { formatMoney, lastDays, LeadStatusBadge, RANGES, type RangeValue } from "@/components/agency/lead-status";
import { NewLeadDialog } from "@/components/agency/new-lead-dialog";
import { useAgency } from "@/components/agency/use-agency";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Button, ButtonLink } from "@/components/ds/ui/button";
import { Card, CardHeader, TextLink } from "@/components/ds/ui/card";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { EmptyState, InfoStrip, KpiGrid } from "@/components/ds/ui/misc";
import { UnderlineTabs } from "@/components/ds/ui/tabs";
import { repoPath } from "@/lib/paths";

import { LeadSources } from "./lead-sources";
import { LeadNameCell, LeadsTable } from "./leads-table";

const TABS = ["overview", "all", "sources", "settings"] as const;
type Tab = (typeof TABS)[number];

/**
 * Leads app. Overview (sources strip, performance KPIs, latest leads), the
 * full list, sources and the capture-script settings. Ad spend and cost per
 * ad lead stay "—": ads reporting left the hub.
 */
export function LeadsPage() {
  const trpc = useTRPC();
  const { projectId, role } = useAgency();
  const base = repoPath(projectId, "leads");
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("overview"));
  const [days, setDays] = useState<RangeValue>("30");

  const total = useQuery(
    trpc.agency.leads.list.queryOptions({ projectId, page: 1, pageSize: 1 })
  );

  return (
    <>
      <PageHeader
        title="Leads"
        description="Where your leads come from and who to follow up with."
        actions={role !== "view-only" ? <NewLeadDialog /> : undefined}
        tabs={
          <UnderlineTabs
            label="Leads sections"
            value={tab}
            onChange={(id) => void setTab(id as Tab)}
            items={[
              { id: "overview", label: "Overview" },
              { id: "all", label: "All leads", count: total.data?.total },
              { id: "sources", label: "Sources" },
              { id: "settings", label: "Settings" },
            ]}
          />
        }
      />
      {tab === "overview" && (
        <Overview days={days} setDays={setDays} base={base} onViewAll={() => void setTab("all")} />
      )}
      {tab === "all" && <LeadsTable />}
      {tab === "sources" && <LeadSources onOpenSettings={() => void setTab("settings")} />}
      {tab === "settings" && (
        <>
          <InstallSnippet />
          <Card className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold">Allowed domains and notifications</span>
              <p className="text-[13px] text-dim">
                Which sites may send leads here and where new leads are emailed live in Domain
                settings.
              </p>
            </div>
            <ButtonLink href={repoPath(projectId, "domain")}>Open Domain settings</ButtonLink>
          </Card>
        </>
      )}
    </>
  );
}

function Overview({
  days,
  setDays,
  base,
  onViewAll,
}: {
  days: RangeValue;
  setDays: (v: RangeValue) => void;
  base: string;
  onViewAll: () => void;
}) {
  const trpc = useTRPC();
  const { projectId, canInstall } = useAgency();
  const range = useMemo(() => lastDays(Number(days)), [days]);
  const stats = useQuery(
    trpc.agency.leads.stats.queryOptions({ projectId, ...range }, { placeholderData: keepPreviousData })
  );
  const latest = useQuery(
    trpc.agency.leads.list.queryOptions({ projectId, page: 1, pageSize: 5 })
  );

  const count = (channel: string) =>
    stats.data?.byChannel.find((row) => row.channel === channel)?.leads ?? 0;
  const n = (v: number | undefined) => (stats.data ? String(v ?? 0) : "—");

  type Row = NonNullable<typeof latest.data>["rows"][number];
  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Name",
      width: "minmax(220px, 2fr)",
      cell: (lead) => <LeadNameCell lead={lead} />,
    },
    { key: "source", header: "Source", width: "minmax(120px, 1fr)", cell: (lead) => <ChannelBadge channel={lead.channel} /> },
    { key: "status", header: "Status", width: "minmax(100px, 1fr)", cell: (lead) => <LeadStatusBadge status={lead.status} /> },
    {
      key: "received",
      header: "Received",
      width: "minmax(120px, 1fr)",
      cell: (lead) => (
        <span className="text-dim">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>
      ),
    },
  ];

  return (
    <>
      <InfoStrip
        items={[
          {
            label: "Website forms",
            value: canInstall ? (
              <span className="inline-flex items-center gap-1.5 text-success-text">
                <span className="size-[7px] rounded-full bg-success" />
                Connected
              </span>
            ) : (
              <span className="text-dim">Not set up</span>
            ),
          },
          {
            label: "Added by hand",
            value: (
              <span className="inline-flex items-center gap-1.5 text-success-text">
                <span className="size-[7px] rounded-full bg-success" />
                On
              </span>
            ),
          },
        ]}
      />

      <Card className={cn("transition-opacity", stats.isPlaceholderData && "opacity-60")}>
        <CardHeader
          title="Performance"
          action={
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="sm" trailingIcon={<ChevronDown className="size-3.5" />}>
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
          }
        />
        <div className="px-2 pb-2">
          <KpiGrid
            bare
            items={[
              { label: "Leads", value: n(stats.data?.leads) },
              { label: "From ads", value: stats.data ? String(count("google_ads") + count("paid_other")) : "—" },
              { label: "Organic", value: stats.data ? String(count("organic_search")) : "—" },
              { label: "Ad spend", value: "—" },
              { label: "Cost per ad lead", value: "—" },
              { label: "Won revenue", value: stats.data ? formatMoney(stats.data.wonValueCents ?? 0) : "—" },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Latest leads"
          divided
          action={
            <TextLink href={`${base}?tab=all`} onClick={onViewAll}>
              View all
            </TextLink>
          }
        />
        <DataTable
          columns={columns}
          rows={latest.data?.rows ?? []}
          rowKey={(lead) => String(lead.id)}
          rowHref={(lead) => `${base}/${lead.id}`}
          minWidth={560}
          empty={
            latest.isPending ? (
              <div className="px-6 py-12 text-center text-[13px] text-dim">Loading leads…</div>
            ) : (
              <EmptyState
                icon={<Inbox className="size-5" />}
                title="No leads yet"
                text="Form submissions from your website show up here, along with leads you add by hand."
              />
            )
          }
        />
      </Card>
    </>
  );
}
