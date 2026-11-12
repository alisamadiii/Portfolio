"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Inbox, Search } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";
import type { AgencyLeadChannel, AgencyLeadStatus } from "@workspace/drizzle/schema";
import { cn } from "@workspace/ui/lib/utils";

import {
  CHANNEL_LABELS,
  CHANNEL_ORDER,
  ChannelBadge,
  channelDetail,
  urlPath,
} from "@/components/agency/lead-channel";
import { formatMoney, LEAD_STATUSES, LeadStatusBadge } from "@/components/agency/lead-status";
import { useAgency } from "@/components/agency/use-agency";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Select } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { repoPath } from "@/lib/paths";

const PAGE_SIZE = 25;
const ALL_SOURCES = "all";

type LeadRow = NonNullable<
  ReturnType<typeof useLeadsList>["data"]
>["rows"][number];

function useLeadsList(input: {
  projectId: string;
  status?: AgencyLeadStatus;
  channel?: AgencyLeadChannel;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const trpc = useTRPC();
  return useQuery(
    trpc.agency.leads.list.queryOptions(input, { placeholderData: keepPreviousData })
  );
}

/**
 * Avatar initials + name, with the message or email line under it.
 * `href` makes the name a link; omit it when the whole row already is one.
 */
export function LeadNameCell({ lead, href }: { lead: LeadRow; href?: string }) {
  const label = lead.name || lead.email || lead.phone || `Lead #${lead.id}`;
  return (
    <span className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tile text-[13px] font-semibold text-ink-3">
        {label.charAt(0).toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-col">
        {href ? (
          <Link
            href={href}
            className="truncate text-sm font-medium text-ink"
            onClick={(event) => event.stopPropagation()}
          >
            {label}
          </Link>
        ) : (
          <span className="truncate text-sm font-medium text-ink">{label}</span>
        )}
        {lead.message ? (
          <span className="line-clamp-1 max-w-[320px] text-xs text-dim">{lead.message}</span>
        ) : lead.email ? (
          <span className="truncate text-xs text-dim">{lead.email}</span>
        ) : null}
      </span>
    </span>
  );
}

/** The full leads list: status filter, source select, search, pagination. */
export function LeadsTable() {
  const router = useRouter();
  const { projectId } = useAgency();
  const base = repoPath(projectId, "leads");

  const [status, setStatus] = useState<AgencyLeadStatus | undefined>();
  const [channel, setChannel] = useState<AgencyLeadChannel | typeof ALL_SOURCES>(ALL_SOURCES);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isPlaceholderData } = useLeadsList({
    projectId,
    status,
    channel: channel === ALL_SOURCES ? undefined : channel,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const columns: Column<LeadRow>[] = [
    {
      key: "lead",
      header: "Lead",
      width: "minmax(240px, 2fr)",
      cell: (lead) => <LeadNameCell lead={lead} href={`${base}/${lead.id}`} />,
    },
    {
      key: "source",
      header: "Source",
      width: "minmax(140px, 1fr)",
      cell: (lead) => (
        <span className="flex flex-col items-start gap-1">
          <ChannelBadge channel={lead.channel} withInfo />
          {channelDetail(lead) && (
            <span className="line-clamp-1 max-w-[220px] text-xs text-dim">{channelDetail(lead)}</span>
          )}
        </span>
      ),
    },
    {
      key: "page",
      header: "Landing page",
      width: "minmax(140px, 1fr)",
      cell: (lead) => (
        <span className="block truncate text-dim">{urlPath(lead.landingPage ?? lead.pageUrl) ?? ""}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "minmax(110px, 0.8fr)",
      cell: (lead) => <LeadStatusBadge status={lead.status} />,
    },
    {
      key: "value",
      header: "Value",
      width: "minmax(90px, 0.6fr)",
      align: "end",
      cell: (lead) => (
        <span className="tabular-nums">
          {lead.valueCents ? formatMoney(lead.valueCents, lead.currency) : ""}
        </span>
      ),
    },
    {
      key: "received",
      header: "Received",
      width: "minmax(120px, 0.8fr)",
      align: "end",
      cell: (lead) => (
        <span className="text-dim">
          {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <Card className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-3">
        <SegmentedTabs
          label="Filter leads by status"
          value={status ?? "all"}
          onChange={(v) => {
            setStatus(v === "all" ? undefined : (v as AgencyLeadStatus));
            setPage(1);
          }}
          items={[
            { id: "all", label: "All", count: data?.total },
            ...LEAD_STATUSES.map((s) => ({ id: s.value, label: s.label })),
          ]}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select
            aria-label="Source"
            className="w-44"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value as AgencyLeadChannel | typeof ALL_SOURCES);
              setPage(1);
            }}
          >
            <option value={ALL_SOURCES}>All sources</option>
            {CHANNEL_ORDER.map((value) => (
              <option key={value} value={value}>
                {CHANNEL_LABELS[value]}
              </option>
            ))}
          </Select>
          <label className="flex h-9 w-[240px] max-w-full items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-dim">
            <Search className="size-4" aria-hidden />
            <input
              type="search"
              aria-label="Search leads"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, phone"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            />
          </label>
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(lead) => String(lead.id)}
        minWidth={860}
        onRowClick={(lead) => router.push(`${base}/${lead.id}`)}
        empty={
          isLoading ? (
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
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-divider px-6 py-3 text-[13px]">
          <span className="text-dim">
            Page {page} of {pageCount}
          </span>
          <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}
