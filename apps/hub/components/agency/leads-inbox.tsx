"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import type { AgencyLeadStatus } from "@workspace/drizzle/schema";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { useAgency } from "@/components/agency/agency-context";
import { NewLeadDialog } from "@/components/agency/new-lead-dialog";
import {
  formatMoney,
  LEAD_STATUSES,
  LeadStatusBadge,
} from "@/components/agency/lead-status";
import { Inbox, Search } from "@/components/icon";

const PAGE_SIZE = 25;

export function LeadsInbox() {
  const trpc = useTRPC();
  const router = useRouter();
  const { repoId, role } = useAgency();

  const [status, setStatus] = useState<AgencyLeadStatus | undefined>();
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

  const { data, isLoading } = useQuery(
    trpc.agency.leads.list.queryOptions(
      {
        repoId,
        status,
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      },
      { placeholderData: keepPreviousData }
    )
  );

  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {[{ value: undefined, label: "All" }, ...LEAD_STATUSES].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                setStatus(option.value);
                setPage(1);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                status === option.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, phone"
              className="w-64 pl-8"
            />
          </div>
          {role !== "view-only" && <NewLeadDialog />}
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full rounded" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.rows.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer"
                onClick={() => router.push(`/agency/${lead.id}`)}
              >
                <TableCell>
                  <Link
                    href={`/agency/${lead.id}`}
                    className="font-semibold"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {lead.name || lead.email || lead.phone || `Lead #${lead.id}`}
                  </Link>
                  {lead.message && (
                    <p className="text-muted-foreground line-clamp-1 max-w-[320px] text-[13px]">
                      {lead.message}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-[13px]">
                  <div>{lead.email}</div>
                  <div className="text-muted-foreground">{lead.phone}</div>
                </TableCell>
                <TableCell className="text-[13px]">
                  {lead.gclid || lead.gbraid || lead.wbraid
                    ? "Google Ads"
                    : lead.source === "manual"
                      ? "Added by hand"
                      : lead.utm?.source || "Website"}
                </TableCell>
                <TableCell>
                  <LeadStatusBadge status={lead.status} />
                </TableCell>
                <TableCell className="text-right text-[13px]">
                  {lead.valueCents ? formatMoney(lead.valueCents, lead.currency) : ""}
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-[13px]">
                  {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {data && !data.rows.length && (
          <div className="px-6 py-14 text-center">
            <Inbox className="text-muted-foreground mx-auto size-8" />
            <p className="mt-3 font-semibold">No leads yet</p>
            <p className="text-muted-foreground mt-1 text-[14px]">
              Form submissions from your website show up here.
            </p>
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 text-[13px]">
          <span className="text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
