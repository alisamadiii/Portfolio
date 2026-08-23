"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import {
  eachDayOfInterval,
  endOfDay,
  format,
  formatDistanceToNowStrict,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { Area, AreaChart, XAxis } from "recharts";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { DataTable } from "@workspace/ui/custom/data-table";
import type { DateRange } from "@workspace/ui/custom/date-range-picker";
import { DateRangePicker } from "@workspace/ui/custom/date-range-picker";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { EnvelopeMark } from "@/components/emails/envelope-mark";
import { ExportEmailsPdfButton } from "@/components/emails/export-pdf-button";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Search,
} from "@/components/icon";

const PAGE_SIZE = 10;

const TYPE_PILL: Record<string, { label: string; className: string }> = {
  send: {
    label: "Sent",
    className: "bg-status-success-bg text-status-success",
  },
  contact: {
    label: "Contact form",
    className: "bg-status-review-bg text-status-review",
  },
};

// Types are free-form — unknown values get a neutral pill with the raw label.
const pillFor = (type: string) =>
  TYPE_PILL[type] ?? {
    label: type,
    className: "bg-muted text-muted-foreground",
  };

const chartConfig = {
  total: { label: "Emails", color: "var(--status-success)" },
} satisfies ChartConfig;

const PanelHeading = () => (
  <div>
    <h2 className="text-[22px] font-extrabold tracking-tight">Emails</h2>
    <p className="text-muted-foreground mt-1 text-[14px]">
      Every email sent from this website — receipts, notifications, and
      contact-form messages.
    </p>
  </div>
);

export function EmailsPanel() {
  const trpc = useTRPC();
  const { config } = useConfig();
  const { data: currentUser } = useCurrentUser();

  const owner = config?.owner;
  const repo = config?.repo;
  const enabled = !!owner && !!repo;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [range, setRange] = useState<DateRange | undefined>(() => ({
    from: startOfDay(subDays(new Date(), 29)),
    to: new Date(),
  }));

  // Local debounce — no extra dep, mirrors the account page's 300ms.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

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
      {
        owner: owner ?? "",
        repo: repo ?? "",
        ...filterInput,
        page,
        limit: PAGE_SIZE,
      },
      { enabled, placeholderData: keepPreviousData }
    )
  );

  const { data: stats } = useQuery(
    trpc.emails.stats.queryOptions(
      {
        owner: owner ?? "",
        repo: repo ?? "",
        from: filterInput.from,
        to: filterInput.to,
      },
      { enabled, placeholderData: keepPreviousData }
    )
  );

  const { data: typeOptions } = useQuery(
    trpc.emails.types.queryOptions(
      { owner: owner ?? "", repo: repo ?? "" },
      { enabled }
    )
  );

  // Zero-fill every day in the range so the chart has no gaps.
  const chartData = useMemo(() => {
    if (!range?.from || !range?.to) return [];
    const byDate = new Map((stats?.daily ?? []).map((d) => [d.date, d]));
    return eachDayOfInterval({ start: range.from, end: range.to }).map(
      (day) => {
        const key = format(day, "yyyy-MM-dd");
        const bucket = byDate.get(key);
        const send = bucket?.send ?? 0;
        const contact = bucket?.contact ?? 0;
        return { date: key, send, contact, total: send + contact };
      }
    );
  }, [stats, range]);

  const emails = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const totals = stats?.totals ?? { total: 0, send: 0, contact: 0 };

  const rangeLabel =
    range?.from && range?.to
      ? `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`
      : "All time";

  if (!owner || !repo) return null;

  if (selectedId) {
    return (
      <div className="mx-auto w-full max-w-screen-md p-6">
        <EmailDetail
          owner={owner}
          repo={repo}
          id={selectedId}
          onBack={() => setSelectedId(null)}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
        <PanelHeading />
        <div className="border-destructive/40 bg-destructive/5 rounded-lg border py-14 text-center">
          <div className="mx-auto max-w-sm space-y-2.5">
            <h3 className="text-[20px] font-extrabold tracking-tight">
              Something went wrong
            </h3>
            <p className="text-muted-foreground text-[14px]">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !isLoading && total === 0;
  const isFilteredEmpty =
    isEmpty && (!!debouncedSearch || typeFilter !== "all");

  return (
    <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
      <PanelHeading />

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Total sent" value={totals.total} />
        <StatTile
          label="Sent"
          value={totals.send}
          dotClassName="bg-status-success"
        />
        <StatTile
          label="Contact form"
          value={totals.contact}
          dotClassName="bg-status-review"
        />
      </div>

      {/* ── Analytics chart ── */}
      {totals.total > 0 && chartData.length > 0 && (
        <div className="bg-card rounded-lg border p-4">
          <p className="text-muted-foreground mb-3 text-[13px] font-medium">
            Emails per day
          </p>
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[200px] w-full"
          >
            <AreaChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
              <defs>
                <linearGradient id="fillEmails" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-total)"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-total)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={28}
                tickFormatter={(value: string) =>
                  format(parseISO(value), "MMM d")
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      format(parseISO(String(value)), "MMM d, yyyy")
                    }
                  />
                }
              />
              <Area
                dataKey="total"
                type="linear"
                stroke="var(--color-total)"
                strokeWidth={2}
                fill="url(#fillEmails)"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      )}

      {/* ── Filters ── */}
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
            owner={owner}
            repo={repo}
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
          <h3 className="text-[20px] font-extrabold tracking-tight">
            {isFilteredEmpty ? "No emails match" : "No emails yet"}
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[380px] text-[14px]">
            {isFilteredEmpty
              ? "Nothing in this range. Try widening the dates or clearing the search."
              : "Emails sent from this website — receipts, notifications, and contact-form messages — will appear here."}
          </p>
          {isFilteredEmpty && (
            <Button
              variant="outline"
              className="mt-5 rounded-full px-5"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
                setPage(0);
              }}
            >
              Clear filters
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
                    <div className="bg-status-success-bg border-status-success/50 text-status-success grid size-9 shrink-0 place-items-center rounded-[10px] border">
                      <EnvelopeMark className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block max-w-[240px] truncate text-sm font-medium">
                        {row.original.to.join(", ")}
                      </span>
                      {row.original.visitorEmail && (
                        <span className="text-muted-foreground block max-w-[240px] truncate text-xs">
                          from {row.original.visitorEmail}
                        </span>
                      )}
                    </div>
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
                      {
                        addSuffix: true,
                      }
                    )}
                  </div>
                ),
              },
            ]}
            data={emails}
            onRowClick={(row) => setSelectedId(row.original.id)}
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

// ─── KPI tile ────────────────────────────────────────────────────

const StatTile = ({
  label,
  value,
  dotClassName,
}: {
  label: string;
  value: number;
  dotClassName?: string;
}) => (
  <div className="bg-card rounded-lg border px-4 py-3">
    <div className="text-muted-foreground flex items-center gap-1.5 text-[12.5px] font-medium">
      {dotClassName && (
        <span className={cn("size-2 rounded-full", dotClassName)} />
      )}
      {label}
    </div>
    <p className="mt-1 text-[26px] font-extrabold tracking-tight tabular-nums">
      {value.toLocaleString()}
    </p>
  </div>
);

// ─── Detail (in-panel, replaces the old /emails/[id] route) ──────

const MetaItem = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="min-w-0">
    <p className="text-muted-foreground text-[11.5px] font-semibold tracking-[0.04em] uppercase">
      {label}
    </p>
    <div className="mt-1.5 text-sm font-medium">{children}</div>
  </div>
);

const CopyIdChip = ({ id }: { id: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(id);
        setCopied(true);
        toast.success("Email ID copied");
        setTimeout(() => setCopied(false), 1500);
      }}
      className="bg-muted hover:bg-muted/70 flex max-w-full items-center gap-2 rounded-md px-2.5 py-1 font-mono text-xs transition-colors"
      title={id}
    >
      <span className="truncate">{id}</span>
      {copied ? (
        <Check className="text-status-success size-3.5 shrink-0" />
      ) : (
        <Copy className="text-muted-foreground size-3.5 shrink-0" />
      )}
    </button>
  );
};

const BackButton = ({ onBack }: { onBack: () => void }) => (
  <button
    type="button"
    onClick={onBack}
    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
  >
    <ArrowLeft className="size-4" />
    Emails
  </button>
);

function EmailDetail({
  owner,
  repo,
  id,
  onBack,
}: {
  owner: string;
  repo: string;
  id: string;
  onBack: () => void;
}) {
  const trpc = useTRPC();

  const {
    data: email,
    isLoading,
    error,
  } = useQuery(
    trpc.emails.get.queryOptions({ owner, repo, id }, { enabled: !!id })
  );

  // The presigned URL dies in ~60s, so it's a mutation fetched fresh — once
  // for the inline preview, and again on every open-in-new-tab / retry.
  const view = useMutation(trpc.emails.getViewUrl.mutationOptions());
  const { mutate: loadPreview } = view;

  useEffect(() => {
    if (email) loadPreview({ owner, repo, id: email.id });
  }, [email?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openInNewTab = () => {
    // Open synchronously so popup blockers don't eat the tab.
    const tab = window.open("", "_blank");
    view.mutate(
      { owner, repo, id },
      {
        onSuccess: ({ url }) => {
          if (tab) tab.location.href = url;
        },
        onError: (mutationError) => {
          tab?.close();
          toast.error(mutationError.message);
        },
      }
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <BackButton onBack={onBack} />
        <div className="rounded-lg border border-dashed px-6 py-14 text-center">
          <h3 className="text-[20px] font-extrabold tracking-tight">
            Email not found
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[380px] text-[14px]">
            This email doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !email) {
    return (
      <div className="space-y-6">
        <BackButton onBack={onBack} />
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-7 w-72" />
          </div>
        </div>
        <Skeleton className="h-[60vh] w-full rounded-lg" />
      </div>
    );
  }

  const recipient = email.to.join(", ");

  return (
    <div className="space-y-6">
      <BackButton onBack={onBack} />

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="bg-status-success-bg text-status-success grid size-14 shrink-0 place-items-center rounded-2xl border border-green-500/50">
          <EnvelopeMark className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium">Email</p>
          <h2 className="truncate text-[24px] font-extrabold tracking-tight">
            {recipient}
          </h2>
        </div>
        <Button
          variant="outline"
          className="shrink-0 gap-2 rounded-full px-4"
          onClick={() => {
            void navigator.clipboard.writeText(
              `${window.location.origin}/e/${email.id}`
            );
            toast.success("Shareable link copied");
          }}
        >
          <Copy className="size-4" />
          Copy link
        </Button>
        <Button
          variant="outline"
          className="shrink-0 gap-2 rounded-full px-4"
          onClick={openInNewTab}
          isLoading={view.isPending}
        >
          <ExternalLink className="size-4" />
          Open
        </Button>
      </div>

      {/* ── Meta grid ── */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
        <MetaItem label="From">
          <p className="truncate" title={email.fromAddress}>
            {email.fromAddress}
          </p>
        </MetaItem>
        <MetaItem label="Subject">
          <p className="truncate" title={email.subject}>
            {email.subject}
          </p>
        </MetaItem>
        <MetaItem label="To">
          <p className="truncate" title={recipient}>
            {recipient}
          </p>
        </MetaItem>
        <MetaItem label="ID">
          <CopyIdChip id={email.id} />
        </MetaItem>
      </div>

      {/* ── Preview ── */}
      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="border-rule flex items-center justify-between border-b px-4 py-3">
          <Badge className="bg-accent text-accent-foreground rounded-full px-3.5 py-1.5 text-sm font-semibold">
            Preview
          </Badge>
        </div>
        {view.data?.url ? (
          <iframe
            src={view.data.url}
            title={email.subject}
            sandbox="allow-same-origin"
            className="h-[70vh] w-full bg-white"
          />
        ) : view.isError ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Preview unavailable.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full px-5"
              onClick={() => loadPreview({ owner, repo, id: email.id })}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="p-4">
            <Skeleton className="h-[70vh] w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
