"use client";

import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

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
import { PACING_LABELS } from "@workspace/trpc/lib/agency/budget-pacing";

import { StatCard } from "@/components/agency/ads-performance";
import { useCampaignFilter } from "@/components/agency/campaign-filter";
import { formatMoney } from "@/components/agency/lead-status";
import { useAgency } from "@/components/agency/use-agency";
import { Pencil } from "@/components/icon";

const dollars = (cents: number, currency: string) => formatMoney(cents, currency);

export function BudgetPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { repoId } = useAgency();
  const { campaignId } = useCampaignFilter();

  const budget = useQuery(
    trpc.agency.ads.budget.get.queryOptions(
      { repoId },
      { placeholderData: keepPreviousData }
    )
  );
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.agency.ads.budget.pathKey(),
    });

  const setTarget = useMutation(
    trpc.agency.ads.budget.setTarget.mutationOptions({
      onSuccess: () => {
        toast.success("Monthly budget saved.");
        refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const setCampaignBudget = useMutation(
    trpc.agency.ads.budget.setCampaignBudget.mutationOptions({
      onSuccess: () => {
        toast.success("Daily budget updated in Google Ads.");
        setEditing(null);
        refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const [targetInput, setTargetInput] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    budgetResourceName: string;
    value: string;
  } | null>(null);

  if (budget.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (budget.error)
    return (
      <p className="text-destructive text-[14px]">{budget.error.message}</p>
    );
  if (!budget.data) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="font-semibold">No Google Ads account linked yet</p>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Once your account is linked, budget pacing shows here.
        </p>
      </div>
    );
  }

  const data = budget.data;
  const { pacing, targetCents, currency } = data;
  const target =
    targetInput ?? (targetCents ? String(targetCents / 100) : "");

  const saveTarget = () => {
    const value = Number(target);
    setTarget.mutate({
      repoId,
      monthlyCents: value > 0 ? Math.round(value * 100) : null,
    });
    setTargetInput(null);
  };

  return (
    <div
      className={cn(
        "space-y-6 transition-opacity duration-200",
        budget.isPlaceholderData && "opacity-50"
      )}
    >
      {/* Monthly target */}
      <div className="bg-card rounded-2xl border p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-[16px] font-semibold">Monthly budget</h3>
            <p className="text-muted-foreground mt-1 max-w-2xl text-[14px]">
              What this account should spend per calendar month. Pacing and
              overspend alerts are measured against it.
            </p>
          </div>
          {data.canManage && (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveTarget();
              }}
            >
              <div className="relative">
                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-[14px]">
                  $
                </span>
                <Input
                  value={target}
                  inputMode="decimal"
                  placeholder="1500"
                  className="w-36 pl-7"
                  onChange={(event) =>
                    setTargetInput(event.target.value.replace(/[^\d.]/g, ""))
                  }
                />
              </div>
              <Button type="submit" disabled={setTarget.isPending}>
                Save
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Pacing */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Spent this month"
          value={dollars(data.spentCents, currency)}
          hint={`Day ${pacing.daysElapsed} of ${pacing.daysInMonth}`}
        />
        <StatCard
          label="Projected month end"
          value={dollars(pacing.projectedCents, currency)}
          hint={
            pacing.status
              ? `${PACING_LABELS[pacing.status]} at ${Math.round((pacing.pace ?? 0) * 100)}% of budget`
              : "Set a monthly budget to see pacing"
          }
        />
        <StatCard
          label="Monthly budget"
          value={targetCents ? dollars(targetCents, currency) : "–"}
        />
        <StatCard
          label="Suggested daily budget"
          value={
            pacing.suggestedDailyCents !== null
              ? dollars(pacing.suggestedDailyCents, currency)
              : "–"
          }
          hint={
            pacing.suggestedDailyCents !== null
              ? `To land on budget over the last ${pacing.daysLeft} days`
              : undefined
          }
        />
      </div>

      {/* Per campaign */}
      <div className="bg-card overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Campaign</TableHead>
              <TableHead className="text-right">Daily budget</TableHead>
              <TableHead className="text-right">Spent this month</TableHead>
              <TableHead>Limited by budget</TableHead>
              {data.canManage && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data.campaigns.length && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-10 text-center"
                >
                  No campaigns in this Google Ads account yet.
                </TableCell>
              </TableRow>
            )}
            {data.campaigns.map((campaign) => {
              const isEditing =
                editing?.budgetResourceName === campaign.budgetResourceName;
              return (
                <TableRow
                  key={campaign.id}
                  data-selected={campaign.id === campaignId || undefined}
                  className="data-[selected]:bg-muted"
                >
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          campaign.status === "ENABLED"
                            ? "bg-chart-2"
                            : "bg-muted-foreground/40"
                        )}
                      />
                      <span className="font-medium">{campaign.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {isEditing ? (
                      <form
                        className="flex items-center justify-end gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const value = Number(editing.value);
                          if (!value || value <= 0)
                            return toast.error("Enter a daily budget.");
                          setCampaignBudget.mutate({
                            repoId,
                            budgetResourceName: campaign.budgetResourceName,
                            dailyBudgetCents: Math.round(value * 100),
                          });
                        }}
                      >
                        <Input
                          autoFocus
                          value={editing.value}
                          inputMode="decimal"
                          className="h-8 w-24 text-right"
                          onChange={(event) =>
                            setEditing({
                              ...editing,
                              value: event.target.value.replace(/[^\d.]/g, ""),
                            })
                          }
                          onKeyDown={(event) =>
                            event.key === "Escape" && setEditing(null)
                          }
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={setCampaignBudget.isPending}
                        >
                          Save
                        </Button>
                      </form>
                    ) : (
                      `${dollars(campaign.dailyBudgetCents, currency)}/day`
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {dollars(campaign.spentCents, currency)}
                  </TableCell>
                  <TableCell>
                    {campaign.budgetLostShare > 0.05 ? (
                      <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-[11.5px] font-medium">
                        Missing {Math.round(campaign.budgetLostShare * 100)}% of
                        impressions
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[13px]">
                        No
                      </span>
                    )}
                  </TableCell>
                  {data.canManage && (
                    <TableCell className="pr-3 text-right">
                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${campaign.name} daily budget`}
                          onClick={() =>
                            setEditing({
                              budgetResourceName: campaign.budgetResourceName,
                              value: String(campaign.dailyBudgetCents / 100),
                            })
                          }
                        >
                          <Pencil className="size-4" />
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
      <p className="text-muted-foreground text-[12.5px]">
        Google can spend up to twice a daily budget on strong days and balances
        it out across the month. Campaigns sharing one budget change together.
      </p>
    </div>
  );
}
