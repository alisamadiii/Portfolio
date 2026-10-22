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
import { Switch } from "@workspace/ui/components/switch";
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
} from "@/components/agency/lead-status";
import { useAgency } from "@/components/agency/use-agency";

type Excluding = {
  term: string;
  campaignId: string;
  campaignName: string;
  matchType: "EXACT" | "PHRASE";
};

export function SearchTermsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { repoId } = useAgency();
  const { campaignId } = useCampaignFilter();
  const [days, setDays] = useState<RangeValue>("30");
  const range = useMemo(() => lastDays(Number(days)), [days]);
  const [wastedOnly, setWastedOnly] = useState(false);
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

  if (list.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (list.error)
    return <p className="text-destructive text-[14px]">{list.error.message}</p>;
  if (!list.data) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="font-semibold">No Google Ads account linked yet</p>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Once your account is linked, the searches that trigger your ads show
          here.
        </p>
      </div>
    );
  }

  const data = list.data;
  const rows = wastedOnly
    ? data.rows.filter((row) => row.costCents > 0 && row.conversions === 0)
    : data.rows;
  const currency = "USD";
  const wastedCents = data.rows
    .filter((row) => row.costCents > 0 && row.conversions === 0)
    .reduce((sum, row) => sum + row.costCents, 0);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground text-[14px]">
            {data.rows.length} search {data.rows.length === 1 ? "term" : "terms"}
            {wastedCents > 0 && (
              <>
                {" "}
                · <span className="text-destructive font-medium">
                  {formatMoney(wastedCents, currency)}
                </span>{" "}
                spent on terms with no conversions
              </>
            )}
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-[14px]">
            <Switch checked={wastedOnly} onCheckedChange={setWastedOnly} />
            Wasted spend only
          </label>
        </div>
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
      </div>

      {/* Table */}
      <div
        className={cn(
          "bg-card overflow-hidden rounded-2xl border transition-opacity duration-200",
          list.isPlaceholderData && "opacity-50"
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Search term</TableHead>
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
                    ? "No wasted spend in this range. Nice."
                    : "No search terms in this range yet. Google also hides rare searches, so new accounts start empty."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const wasted = row.costCents > 0 && row.conversions === 0;
              const excluded = row.status === "EXCLUDED";
              return (
                <TableRow key={`${row.campaignId}\n${row.term}`}>
                  <TableCell className="max-w-[360px] pl-5">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{row.term}</span>
                      {excluded && (
                        <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium">
                          Excluded
                        </span>
                      )}
                      {row.status === "ADDED" && (
                        <span className="bg-chart-2/15 text-chart-2 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium">
                          Keyword
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate text-[13px]">
                    {row.campaignName}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      wasted && "text-destructive font-medium"
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
                    <TableCell className="pr-3 text-right">
                      {!excluded && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExcluding({
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
      </div>

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
    </div>
  );
}

const MATCH_ITEMS = [
  { value: "EXACT", label: "This exact search only" },
  { value: "PHRASE", label: "Any search containing it" },
];
