"use client";

import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
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

import { useCampaignFilter } from "@/components/agency/campaign-filter";
import {
  formatMoney,
  lastDays,
  RANGES,
  type RangeValue,
  StatusPill,
} from "@/components/agency/lead-status";
import { MarketingTabs } from "@/components/agency/marketing-tabs";
import { PageShell, TableCard } from "@/components/agency/page-shell";
import { StarterNegativeLists } from "@/components/agency/starter-negative-lists";
import { TriangleAlert, X } from "@/components/icon";
import { useAgency } from "@/components/agency/use-agency";

type Excluding = {
  term: string;
  campaignId: string;
  campaignName: string;
  matchType: "EXACT" | "PHRASE";
};

type Segment = "all" | "wasted" | "excluded";

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "all", label: "All" },
  { value: "wasted", label: "Wasted spend" },
  { value: "excluded", label: "Excluded" },
];

export function SearchTermsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { repoId } = useAgency();
  const { campaignId } = useCampaignFilter();
  const [days, setDays] = useState<RangeValue>("30");
  const range = useMemo(() => lastDays(Number(days)), [days]);
  const [segment, setSegment] = useState<Segment>("all");
  const [excluding, setExcluding] = useState<Excluding | null>(null);

  const list = useQuery(
    trpc.agency.ads.searchTerms.list.queryOptions(
      { repoId, ...range, campaignId: campaignId ?? undefined },
      { placeholderData: keepPreviousData }
    )
  );
  const exclude = useMutation(
    trpc.agency.ads.searchTerms.exclude.mutationOptions({
      onSuccess: () => {
        toast.success("Added as a negative keyword in Google Ads.");
        setExcluding(null);
        queryClient.invalidateQueries({
          queryKey: trpc.agency.ads.searchTerms.pathKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const controls = (
    <Select
      items={RANGES}
      value={days}
      onValueChange={(value) => setDays(value as RangeValue)}
    >
      <SelectTrigger size="lg" className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <PageShell
      eyebrow="MARKETING · GOOGLE ADS"
      title="Search terms"
      lead="What people searched before clicking your ads. Exclude the searches that spend money without bringing leads."
      controls={controls}
      tabs={<MarketingTabs />}
    >
      {list.isPending ? (
        <Skeleton className="h-96 w-full rounded-[18px]" />
      ) : list.error ? (
        <p className="text-destructive text-[15px]">{list.error.message}</p>
      ) : !list.data ? (
        <div className="ring-foreground/10 rounded-[18px] p-8 text-center ring-1 ring-dashed">
          <p className="text-[17px] font-semibold">
            No Google Ads account linked yet
          </p>
          <p className="text-muted-foreground mt-1 text-[15px]">
            Once your account is linked, the searches that trigger your ads show
            here.
          </p>
        </div>
      ) : (
        <SearchTermsBody
          data={list.data}
          dimmed={list.isPlaceholderData}
          segment={segment}
          onSegment={setSegment}
          onExclude={setExcluding}
        />
      )}

      <StarterNegativeLists />

      <AlertDialog
        open={Boolean(excluding)}
        onOpenChange={(open) => !open && setExcluding(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Exclude &ldquo;{excluding?.term}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Adds a negative keyword to {excluding?.campaignName}, so your ads
              stop showing for this search.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {excluding && (
            <Select
              items={MATCH_ITEMS}
              value={excluding.matchType}
              onValueChange={(value) =>
                setExcluding({
                  ...excluding,
                  matchType: value as Excluding["matchType"],
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATCH_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={exclude.isPending}
              onClick={() =>
                excluding &&
                exclude.mutate({
                  repoId,
                  campaignId: excluding.campaignId,
                  term: excluding.term,
                  matchType: excluding.matchType,
                })
              }
            >
              Exclude
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function SearchTermsBody({
  data,
  dimmed,
  segment,
  onSegment,
  onExclude,
}: {
  data: {
    rows: {
      term: string;
      campaignId: string;
      campaignName: string;
      costCents: number;
      clicks: number;
      impressions: number;
      conversions: number;
      status: string;
    }[];
    canManage: boolean;
  };
  dimmed: boolean;
  segment: Segment;
  onSegment: (s: Segment) => void;
  onExclude: (e: Excluding) => void;
}) {
  const currency = "USD";
  const isWasted = (row: (typeof data.rows)[number]) =>
    row.costCents > 0 && row.conversions === 0;

  const wastedRows = data.rows.filter(isWasted);
  const wastedCents = wastedRows.reduce((sum, row) => sum + row.costCents, 0);
  const worst = wastedRows.reduce<(typeof data.rows)[number] | null>(
    (worst, row) => (!worst || row.costCents > worst.costCents ? row : worst),
    null
  );

  const counts = {
    all: data.rows.length,
    wasted: wastedRows.length,
    excluded: data.rows.filter((r) => r.status === "EXCLUDED").length,
  };
  const rows =
    segment === "wasted"
      ? wastedRows
      : segment === "excluded"
        ? data.rows.filter((r) => r.status === "EXCLUDED")
        : data.rows;

  return (
    <div className="flex flex-col gap-6">
      {/* Wasted-spend callout */}
      {worst && wastedCents > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-[#f8e6e7] p-6">
          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#a3283a]/12 text-[#a3283a]">
              <TriangleAlert className="size-5" />
            </span>
            <div>
              <p className="text-[18px] font-semibold text-[#a3283a]">
                {formatMoney(wastedCents, currency)} spent on searches that
                brought no leads
              </p>
              <p className="mt-0.5 text-[15px] text-[#7a2230]">
                The worst is &ldquo;{worst.term}&rdquo; at{" "}
                {formatMoney(worst.costCents, currency)}. Exclude it so your ads
                stop showing for that search.
              </p>
            </div>
          </div>
          {data.canManage && (
            <Button
              className="bg-foreground text-background shrink-0"
              onClick={() =>
                onExclude({
                  term: worst.term,
                  campaignId: worst.campaignId,
                  campaignName: worst.campaignName,
                  matchType: "EXACT",
                })
              }
            >
              Exclude &ldquo;{worst.term}&rdquo;
            </Button>
          )}
        </div>
      )}

      {/* Segmented filter */}
      <div className="bg-foreground/5 flex w-fit gap-1 rounded-[12px] p-1">
        {SEGMENTS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onSegment(s.value)}
            className={cn(
              "rounded-[9px] px-3.5 py-1.5 text-[14px] font-medium",
              segment === s.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}{" "}
            <span className="tabular-nums opacity-60">{counts[s.value]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <TableCard className={cn(dimmed && "opacity-50")}>
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
              <TableHead className="pl-6">Search term</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
              {data.canManage && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!rows.length && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-10 text-center"
                >
                  {data.rows.length
                    ? "Nothing in this filter. Nice."
                    : "No search terms in this range yet. Google also hides rare searches, so new accounts start empty."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const wasted = isWasted(row);
              const excluded = row.status === "EXCLUDED";
              return (
                <TableRow
                  key={`${row.campaignId}\n${row.term}`}
                  className={cn("text-[15px]", wasted && "bg-[#f8e6e7]/40")}
                >
                  <TableCell className="max-w-[360px] py-[18px] pl-6">
                    <div className="flex items-center gap-2">
                      {wasted && (
                        <span className="size-1.5 shrink-0 rounded-full bg-[#a3283a]" />
                      )}
                      <span className="truncate font-medium">{row.term}</span>
                      {wasted && (
                        <StatusPill tone="danger" dot={false} className="shrink-0">
                          <X className="size-3" /> No leads
                        </StatusPill>
                      )}
                      {excluded && (
                        <StatusPill tone="neutral" dot={false} className="shrink-0">
                          Excluded
                        </StatusPill>
                      )}
                      {row.status === "ADDED" && (
                        <StatusPill tone="success" dot={false} className="shrink-0">
                          Keyword
                        </StatusPill>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate text-[14px]">
                    {row.campaignName}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      wasted && "font-semibold text-[#a3283a]"
                    )}
                  >
                    {formatMoney(row.costCents, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.clicks.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.impressions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.conversions.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  {data.canManage && (
                    <TableCell className="pr-4 text-right">
                      {!excluded && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onExclude({
                              term: row.term,
                              campaignId: row.campaignId,
                              campaignName: row.campaignName,
                              matchType: "EXACT",
                            })
                          }
                        >
                          Exclude
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableCard>

      <p className="text-muted-foreground text-[14px]">
        Excluding a term adds it as a negative keyword in Google Ads. Your ads
        stop showing for that exact search (or any search containing it), so the
        budget goes to searches that convert.
      </p>
    </div>
  );
}

const MATCH_ITEMS = [
  { value: "EXACT", label: "This exact search only" },
  { value: "PHRASE", label: "Any search containing it" },
];
