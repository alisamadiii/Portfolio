"use client";

import { useEffect, useMemo, useState } from "react";
import { useProject } from "@/hooks/use-project";
import { NotifyEmailCard } from "@/components/settings/notify-email-card";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import { Skeleton } from "@workspace/ui/components/skeleton";
import { DataTable } from "@workspace/ui/custom/data-table";
import type { DateRange } from "@workspace/ui/custom/date-range-picker";
import { DateRangePicker } from "@workspace/ui/custom/date-range-picker";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { EnvelopeMark } from "@/components/emails/envelope-mark";
import { ExportEmailsPdfButton } from "@/components/emails/export-pdf-button";
import { eventPillFor, eventTileFor } from "@/components/emails/status-colors";
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

const chartConfig = {
  total: { label: "Emails", color: "var(--status-success)" },
} satisfies ChartConfig;

const PanelHeading = () => (
  <div>
    <h2 className="text-[22px] font-extrabold tracking-tight">Emails</h2>
    <p className="text-muted-foreground mt-1 text-[14px]">
      Every email sent from your sending domain — receipts, notifications, and
      contact-form messages.
    </p>
  </div>
);

export function EmailsPanel() {
  const trpc = useTRPC();
  const project = useProject();
  const { data: currentUser } = useCurrentUser();

  const repoId = project?.repoId ?? 0;
  const hasProject = !!repoId;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
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
    }),
    [range, debouncedSearch]
  );

  // No sending domain configured → nothing is fetched; the tab shows a
  // setup card instead.
  const { data: gate, isLoading: gateLoading } = useQuery(
    trpc.emails.enabled.queryOptions(
      { repoId },
      { enabled: hasProject }
    )
  );
  const emailsEnabled = hasProject && gate?.enabled === true;

  const { data, isLoading, error, isPlaceholderData } = useQuery(
    trpc.emails.list.queryOptions(
      {
        repoId,
        ...filterInput,
        page,
        limit: PAGE_SIZE,
      },
      { enabled: emailsEnabled, placeholderData: keepPreviousData }
    )
  );

  const { data: stats, isPlaceholderData: statsStale } = useQuery(
    trpc.emails.stats.queryOptions(
      {
        repoId,
        from: filterInput.from,
        to: filterInput.to,
      },
      { enabled: emailsEnabled, placeholderData: keepPreviousData }
    )
  );

  // Zero-fill every day in the range so the chart has no gaps.
  const chartData = useMemo(() => {
    if (!range?.from || !range?.to) return [];
    const byDate = new Map((stats?.daily ?? []).map((d) => [d.date, d.total]));
    return eachDayOfInterval({ start: range.from, end: range.to }).map(
      (day) => {
        const key = format(day, "yyyy-MM-dd");
        return { date: key, total: byDate.get(key) ?? 0 };
      }
    );
  }, [stats, range]);

  const emails = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const totals = stats?.totals ?? { total: 0, delivered: 0, problems: 0 };

  const rangeLabel =
    range?.from && range?.to
      ? `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`
      : "All time";

  if (!repoId) return null;

  if (gateLoading) {
    return (
      <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
        <PanelHeading />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-[86px] rounded-lg" />
          <Skeleton className="h-[86px] rounded-lg" />
          <Skeleton className="h-[86px] rounded-lg" />
        </div>
        <Skeleton className="h-[240px] w-full rounded-lg" />
      </div>
    );
  }

  if (!emailsEnabled) {
    return (
      <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
        <PanelHeading />
        <EmailsSetup repoId={repoId} />
      </div>
    );
  }

  if (selectedId) {
    return (
      <div className="mx-auto w-full max-w-screen-md p-6">
        <EmailDetail
          repoId={repoId}
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
  const isFilteredEmpty = isEmpty && !!debouncedSearch;

  return (
    <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
      <PanelHeading />

      {/* ── Contact-form install snippet ── */}
      <ContactSnippet repoId={repoId} />

      {/* ── Where submissions are emailed ── */}
      <NotifyEmailCard repoId={repoId} />

      {/* ── KPI tiles ── */}
      <div
        className={cn(
          "grid grid-cols-3 gap-3 transition-opacity duration-200",
          statsStale && "opacity-50"
        )}
      >
        <StatTile label="Total sent" value={totals.total} />
        <StatTile
          label="Delivered"
          value={totals.delivered}
          dotClassName="bg-status-success"
        />
        <StatTile
          label="Problems"
          value={totals.problems}
          dotClassName="bg-destructive"
        />
      </div>

      {/* ── Analytics chart ── */}
      {totals.total > 0 && chartData.length > 0 && (
        <div
          className={cn(
            "bg-card rounded-lg border p-4 transition-opacity duration-200",
            statsStale && "opacity-50"
          )}
        >
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
        <DateRangePicker
          value={range}
          onChange={(next) => {
            setRange(next);
            setPage(0);
          }}
        />
        {total > 0 && (
          <ExportEmailsPdfButton
            repoId={repoId}
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
            className={cn(
              "table-card transition-opacity duration-200",
              isPlaceholderData && "opacity-50"
            )}
            isLoading={isLoading && PAGE_SIZE}
            columns={[
              {
                id: "to",
                header: "To",
                cell: ({ row }) => (
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-[10px] border",
                        eventTileFor(row.original.lastEvent)
                      )}
                    >
                      <EnvelopeMark className="size-4" />
                    </div>
                    <span className="block max-w-[240px] truncate text-sm font-medium">
                      {row.original.to.join(", ")}
                    </span>
                  </div>
                ),
              },
              {
                id: "delivery",
                header: "Delivery",
                cell: ({ row }) => {
                  const pill = eventPillFor(row.original.lastEvent);
                  return (
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap capitalize",
                        pill.className
                      )}
                    >
                      {pill.label}
                    </span>
                  );
                },
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
  repoId,
  id,
  onBack,
}: {
  repoId: number;
  id: string;
  onBack: () => void;
}) {
  const trpc = useTRPC();

  const {
    data: email,
    isLoading,
    error,
  } = useQuery(
    trpc.emails.get.queryOptions({ repoId, id }, { enabled: !!id })
  );

  // HTML fetched fresh from useSend — once for the inline preview, and again
  // on every open-in-new-tab / retry.
  const view = useMutation(trpc.emails.getViewUrl.mutationOptions());
  const { mutate: loadPreview } = view;

  useEffect(() => {
    if (email) loadPreview({ repoId, id: email.id });
  }, [email?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openInNewTab = () => {
    // Open synchronously so popup blockers don't eat the tab.
    const tab = window.open("", "_blank");
    view.mutate(
      { repoId, id },
      {
        onSuccess: ({ html }) => {
          if (tab) {
            tab.location.href = URL.createObjectURL(
              new Blob([html], { type: "text/html" })
            );
          }
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
        <div
          className={cn(
            "grid size-14 shrink-0 place-items-center rounded-2xl border",
            eventTileFor(email.lastEvent)
          )}
        >
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
        <MetaItem label="Delivery">
          <p className="capitalize">
            {eventPillFor(email.lastEvent).label}
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
        {view.data?.html ? (
          <iframe
            srcDoc={view.data.html}
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
              onClick={() => loadPreview({ repoId, id: email.id })}
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

// ─── Contact-form install snippet ────────────────────────────────────────────

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.alisamadii.com"
).replace(/\/$/, "");

const EXAMPLE_CONTACT_FORM = `<form data-contact-form="Contact" data-success="Thanks! We'll be in touch soon.">
  <input name="name" placeholder="Your name" required />
  <input name="email" type="email" placeholder="Email" required />
  <textarea name="message" placeholder="How can we help?"></textarea>
  <!-- honeypot: hidden from people, bots fill it in -->
  <input name="_hp" type="text" style="display:none" tabindex="-1" autocomplete="off" />
  <button type="submit">Send</button>
</form>`;

function CopyRow({ code }: { code: string }) {
  return (
    <div className="flex items-start gap-2">
      <code className="bg-muted flex-1 rounded-md p-3 text-[12.5px] break-all whitespace-pre-wrap">
        {code}
      </code>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          navigator.clipboard.writeText(code).then(() => toast.success("Copied."))
        }
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

// The copy-paste snippet for a client's website, shown on the Emails view. The
// script (public/contact.js) posts to /api/agency/contact/<repoId> and sends through
// this project's own team, so messages land in this list.
function ContactSnippet({ repoId }: { repoId: number }) {
  const snippet = `<script src="${API_URL}/contact.js" data-key="${repoId}" defer></script>`;
  return (
    <details className="bg-card rounded-lg border px-5 py-3 text-[14px]">
      <summary className="cursor-pointer font-semibold">Contact form setup</summary>
      <div className="mt-3 space-y-3">
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">
            1. Add this tag to every page.
          </span>{" "}
          It sends your contact forms through this project&apos;s own address, and
          every message shows up here.
        </p>
        <CopyRow code={snippet} />
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">
            2. Add <code>data-contact-form</code> to your form.
          </span>{" "}
          The script takes over the submit and emails you every field — no
          per-field wiring needed.
        </p>
        <CopyRow code={EXAMPLE_CONTACT_FORM} />
        <p className="text-muted-foreground">
          Optional: <code>data-success=&quot;…&quot;</code> changes the thank-you
          text, <code>data-redirect=&quot;/thanks&quot;</code> sends the visitor to
          a page, and the hidden <code>_hp</code> input filters out bots.
        </p>
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">
            Advanced: keep your own validation &amp; messages.
          </span>{" "}
          The script dispatches three cancelable events on the form so your page
          can validate before the send and show its own result UI while the
          script still does the sending. Call{" "}
          <code>preventDefault()</code> on an event to take over that step:
        </p>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>
            <code>contact:beforesubmit</code> — fires before the request; cancel
            it to run your own validation and block the send.
          </li>
          <li>
            <code>contact:success</code> — fires on success; cancel it to show
            your own thank-you instead of the built-in message.
          </li>
          <li>
            <code>contact:error</code> — fires on failure; cancel it to show your
            own error message. <code>event.detail</code> is{" "}
            <code>{"{ status, message }"}</code> — the server&apos;s reason (e.g.
            429 &quot;Too many requests.&quot;) to display.
          </li>
        </ul>
        <p className="text-muted-foreground">
          Fields are still sent by each input&apos;s <code>name</code>, and{" "}
          <code>_hp</code>, <code>data-success</code> and{" "}
          <code>data-redirect</code> work the same. Leave the events alone and the
          built-in behavior above runs unchanged.
        </p>
      </div>
    </details>
  );
}

// ─── Emails setup ────────────────────────────────────────────────────────────

// One-click setup: creates the project's useSend team + an agency-managed,
// auto-verified sending subdomain. No DNS for the user. Full-access only —
// the mutation enforces it (non-full-access callers get a clear error).
function EmailsSetup({ repoId }: { repoId: number }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const setup = useMutation(
    trpc.emails.setup.mutationOptions({
      onSuccess: () => {
        toast.success("Emails are set up for this project.");
        queryClient.invalidateQueries({
          queryKey: trpc.emails.enabled.queryOptions({ repoId }).queryKey,
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <div className="rounded-lg border border-dashed px-6 py-16 text-center">
      <div className="bg-status-neutral-bg border-status-neutral/50 text-status-neutral mx-auto grid size-14 place-items-center rounded-2xl border">
        <EnvelopeMark className="size-6" />
      </div>
      <h3 className="mt-5 text-[20px] font-extrabold tracking-tight">
        Set up emails for this project
      </h3>
      <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[14px]">
        We&apos;ll create a private sending workspace and an agency-managed
        sending address for this site — no DNS to configure. Every email sent
        from the website then shows up here, with delivery tracking.
      </p>
      <Button
        type="button"
        className="mt-6"
        disabled={setup.isPending}
        onClick={() => setup.mutate({ repoId })}
      >
        {setup.isPending ? "Setting up…" : "Set up emails"}
      </Button>
    </div>
  );
}
