"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  endOfDay,
  format,
  formatDistanceToNowStrict,
  startOfDay,
  subDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, Mail, Search } from "lucide-react";
import { useDebounce } from "use-debounce";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type { DateRange } from "@workspace/ui/custom/date-range-picker";
import { DateRangePicker } from "@workspace/ui/custom/date-range-picker";
import { DataTable } from "@workspace/ui/custom/data-table";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { DocumentTitle } from "@/components/document-title";
import { ExportEmailsPdfButton } from "@/components/emails/export-pdf-button";

const PAGE_SIZE = 10;

type EmailLog = RouterOutputs["emails"]["list"]["items"][number];

const TYPE_PILL: Record<string, { label: string; className: string }> = {
  send: { label: "Sent", className: "bg-status-success-bg text-status-success" },
  contact: {
    label: "Contact form",
    className: "bg-status-review-bg text-status-review",
  },
};

// Types are free-form — unknown values get a neutral pill with the raw label.
const pillFor = (type: string) =>
  TYPE_PILL[type] ?? { label: type, className: "bg-muted text-muted-foreground" };

const recipientOf = (email: EmailLog) =>
  email.type === "contact" && email.visitorEmail
    ? email.visitorEmail
    : email.to.join(", ");

const PageHeading = () => (
  <>
    <DocumentTitle title="Emails" />
    <div>
      <h2 className="text-[27px] font-extrabold tracking-tight">Emails</h2>
      <p className="text-muted-foreground mt-1 text-[14.5px]">
        Every email sent on your behalf — receipts, notifications, and
        contact-form messages.
      </p>
    </div>
  </>
);

export default function EmailsPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search.trim(), 300);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [range, setRange] = useState<DateRange | undefined>(() => ({
    from: startOfDay(subDays(new Date(), 29)),
    to: new Date(),
  }));

  // Timezone-correct boundaries computed in the browser; the server only
  // compares instants. ISO strings because tRPC runs without superjson.
  const filterInput = useMemo(
    () => ({
      from: range?.from ? startOfDay(range.from).toISOString() : undefined,
      to: range?.to ? endOfDay(range.to).toISOString() : undefined,
      search: debouncedSearch || undefined,
      type: typeFilter === "all" ? undefined : typeFilter,
    }),
    [range, debouncedSearch, typeFilter]
  );

  const { data, isLoading, error } = useQuery(
    trpc.emails.list.queryOptions(
      { ...filterInput, page, limit: PAGE_SIZE },
      {
        enabled: !!currentUser,
        placeholderData: keepPreviousData,
      }
    )
  );

  const { data: typeOptions } = useQuery(
    trpc.emails.types.queryOptions(undefined, { enabled: !!currentUser })
  );

  const emails = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rangeLabel =
    range?.from && range?.to
      ? `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`
      : "All time";

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <div className="border-destructive/40 bg-destructive/5 rounded-lg border py-14 text-center">
          <div className="mx-auto max-w-sm space-y-2.5">
            <h3 className="text-[22px] font-extrabold tracking-tight">
              Something went wrong
            </h3>
            <p className="text-muted-foreground text-[14.5px]">
              {error.message}
            </p>
            {error.data && (
              <p className="text-destructive font-mono text-xs">
                {(error.data as { code?: string }).code ?? "UNKNOWN_ERROR"}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !isLoading && total === 0;
  const isFilteredEmpty =
    isEmpty && (!!debouncedSearch || !!range || typeFilter !== "all");

  return (
    <div className="space-y-6">
      <PageHeading />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search..."
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v ?? "all");
            setPage(0);
          }}
        >
          <SelectTrigger className="h-10 rounded-full px-4">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(typeOptions ?? []).map((t) => (
              <SelectItem key={t} value={t}>
                {pillFor(t).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangePicker
          value={range}
          onChange={(next) => {
            setRange(next);
            setPage(0);
          }}
        />
        {total > 0 && (
          <ExportEmailsPdfButton
            input={filterInput}
            meta={{
              clientName:
                currentUser?.user.name || currentUser?.user.email || "Client",
              company: currentUser?.user.company ?? undefined,
              rangeLabel,
            }}
          />
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed px-6 py-14 text-center">
          <h3 className="text-[22px] font-extrabold tracking-tight">
            {isFilteredEmpty ? "No emails match" : "No emails yet"}
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[380px] text-[14.5px]">
            {isFilteredEmpty
              ? "Nothing was sent in this range. Try widening the dates or clearing the search."
              : "Emails sent from your website — receipts, notifications, and contact-form messages — will appear here."}
          </p>
          {isFilteredEmpty && (
            <Button
              variant="outline"
              className="mt-5 rounded-full px-5"
              onClick={() => {
                setSearch("");
                setRange(undefined);
                setTypeFilter("all");
                setPage(0);
              }}
            >
              Show all time
            </Button>
          )}
        </div>
      ) : (
        <>
          <DataTable
            className="table-card"
            isLoading={isLoading && PAGE_SIZE}
            columns={[
              {
                id: "to",
                header: "To",
                cell: ({ row }) => (
                  <div className="flex items-center gap-3">
                    <div className="bg-status-success-bg text-status-success grid size-9 shrink-0 place-items-center rounded-[10px] border">
                      <Mail className="size-4" />
                    </div>
                    <span className="max-w-[240px] truncate text-sm font-medium">
                      {recipientOf(row.original)}
                    </span>
                  </div>
                ),
              },
              {
                id: "status",
                header: "Status",
                cell: ({ row }) => (
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
                      pillFor(row.original.type).className
                    )}
                  >
                    {pillFor(row.original.type).label}
                  </span>
                ),
              },
              {
                id: "subject",
                header: "Subject",
                cell: ({ row }) => (
                  <span className="text-muted-foreground block max-w-[320px] truncate text-sm">
                    {row.original.subject}
                  </span>
                ),
              },
              {
                id: "sent",
                header: () => <div className="text-right">Sent</div>,
                cell: ({ row }) => (
                  <div
                    className="text-muted-foreground text-right text-sm whitespace-nowrap"
                    title={format(
                      new Date(row.original.createdAt),
                      "MMM d, yyyy h:mm a"
                    )}
                  >
                    {formatDistanceToNowStrict(
                      new Date(row.original.createdAt),
                      { addSuffix: true }
                    )}
                  </div>
                ),
              },
            ]}
            data={emails}
            onRowClick={(row) => router.push(`/emails/${row.original.id}`)}
          />

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {total > 0
                ? `Showing ${page * PAGE_SIZE + 1}–${Math.min(
                    (page + 1) * PAGE_SIZE,
                    total
                  )} of ${total}`
                : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page === 0}
                onClick={() => setPage((prev) => prev - 1)}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="text-muted-foreground text-sm tabular-nums">
                {page + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
