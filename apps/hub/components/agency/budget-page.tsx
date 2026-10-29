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

import { useCampaignFilter } from "@/components/agency/campaign-filter";
import { formatMoney, StatusPill } from "@/components/agency/lead-status";
import { MarketingTabs } from "@/components/agency/marketing-tabs";
import { FrameCard, PageShell, TableCard } from "@/components/agency/page-shell";
import { Pencil } from "@/components/icon";
import { useAgency } from "@/components/agency/use-agency";

const dollars = (cents: number, currency: string) => formatMoney(cents, currency);

export function BudgetPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useAgency();
  const { campaignId } = useCampaignFilter();

  const budget = useQuery(
    trpc.agency.ads.budget.get.queryOptions(
      { projectId },
      { placeholderData: keepPreviousData }
    )
  );
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.agency.ads.budget.pathKey() });

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

  const data = budget.data;
  const currency = data?.currency ?? "USD";
  const targetCents = data?.targetCents ?? null;
  const target = targetInput ?? (targetCents ? String(targetCents / 100) : "");
  const unsaved =
    targetInput !== null &&
    (Number(targetInput) > 0 ? Math.round(Number(targetInput) * 100) : null) !==
      targetCents;

  const saveTarget = () => {
    const value = Number(target);
    setTarget.mutate({
      projectId,
      monthlyCents: value > 0 ? Math.round(value * 100) : null,
    });
    setTargetInput(null);
  };

  return (
    <PageShell
      eyebrow="MARKETING · GOOGLE ADS"
      title="Budget"
      lead="Whether this month's spend is on track, and each campaign's daily budget."
      tabs={<MarketingTabs />}
    >
      {budget.isPending ? (
        <Skeleton className="h-96 w-full rounded-[18px]" />
      ) : budget.error ? (
        <p className="text-destructive text-[15px]">{budget.error.message}</p>
      ) : !data ? (
        <div className="ring-foreground/10 rounded-[18px] p-8 text-center ring-1 ring-dashed">
          <p className="text-[17px] font-semibold">
            No Google Ads account linked yet
          </p>
          <p className="text-muted-foreground mt-1 text-[15px]">
            Once your account is linked, budget pacing shows here.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-6 transition-opacity duration-200",
            budget.isPlaceholderData && "opacity-50"
          )}
        >
          {/* Pacing hero */}
          <FrameCard innerClassName="flex flex-wrap gap-8 p-8">
            <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-4">
              <span className="font-mono text-[13px] tracking-[0.1em] text-muted-foreground uppercase">
                This month · day {data.pacing.daysElapsed} of{" "}
                {data.pacing.daysInMonth}
              </span>
              <p className="text-[52px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {dollars(data.spentCents, currency)}
              </p>
              <p className="text-muted-foreground text-[16px]">
                {targetCents
                  ? `On pace for ${dollars(data.pacing.projectedCents, currency)} by month end`
                  : "Set a monthly budget to see pacing"}
                {data.pacing.status && (
                  <>
                    {" · "}
                    <span className="text-foreground font-medium">
                      {PACING_LABELS[data.pacing.status]}
                    </span>
                  </>
                )}
              </p>
              {/* Progress bar with Today marker */}
              {targetCents ? (
                <div className="relative mt-2 h-2.5 rounded-full bg-foreground/8">
                  <div
                    className="bg-foreground h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (data.spentCents / targetCents) * 100)}%`,
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{
                      left: `${(data.pacing.daysElapsed / data.pacing.daysInMonth) * 100}%`,
                    }}
                  >
                    <span className="bg-foreground block h-4 w-0.5 -translate-x-1/2 -translate-y-1/2" />
                    <span className="text-muted-foreground absolute top-3 -translate-x-1/2 text-[11px]">
                      Today
                    </span>
                  </div>
                </div>
              ) : null}
              {data.pacing.suggestedDailyCents !== null && (
                <p className="text-muted-foreground mt-2 text-[14px]">
                  Suggested daily budget{" "}
                  <span className="text-foreground font-medium">
                    {dollars(data.pacing.suggestedDailyCents, currency)}
                  </span>{" "}
                  to land on budget over the last {data.pacing.daysLeft} days.
                </p>
              )}
            </div>
            {/* Budget form */}
            <div className="bg-foreground/3 flex min-w-0 flex-[1_1_240px] flex-col gap-3 rounded-[14px] p-5">
              <p className="text-[16px] font-semibold">Monthly budget</p>
              <p className="text-muted-foreground text-[14px]">
                What this account should spend per calendar month.
              </p>
              {data.canManage ? (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveTarget();
                  }}
                >
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-[15px]">
                      $
                    </span>
                    <Input
                      value={target}
                      inputMode="decimal"
                      placeholder="1500"
                      className="pr-16 pl-7"
                      onChange={(event) =>
                        setTargetInput(event.target.value.replace(/[^\d.]/g, ""))
                      }
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-[14px]">
                      / month
                    </span>
                  </div>
                  {unsaved && (
                    <span className="text-[13px] text-[#8a5a0a]">Not saved yet</span>
                  )}
                  <Button type="submit" disabled={setTarget.isPending}>
                    Save budget
                  </Button>
                </form>
              ) : (
                <p className="text-[22px] font-semibold tabular-nums">
                  {targetCents ? dollars(targetCents, currency) : "–"}
                </p>
              )}
            </div>
          </FrameCard>

          {/* Per campaign */}
          <TableCard>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                  <TableHead className="pl-6">Campaign</TableHead>
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
                  const limited = campaign.budgetLostShare > 0.05;
                  return (
                    <TableRow
                      key={campaign.id}
                      data-selected={campaign.id === campaignId || undefined}
                      className="text-[15px] data-[selected]:bg-foreground/4"
                    >
                      <TableCell className="py-[18px] pl-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              campaign.status === "ENABLED"
                                ? "bg-[#2f6b3f]"
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
                                projectId,
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
                        {limited ? (
                          <StatusPill tone="danger">
                            Missing {Math.round(campaign.budgetLostShare * 100)}%
                            of impressions
                          </StatusPill>
                        ) : (
                          <span className="text-muted-foreground text-[14px]">
                            No
                          </span>
                        )}
                      </TableCell>
                      {data.canManage && (
                        <TableCell className="pr-4 text-right">
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
          </TableCard>
          <p className="text-muted-foreground text-[14px]">
            Google can spend up to twice a daily budget on strong days and
            balances it out across the month. Campaigns sharing one budget change
            together.
          </p>
        </div>
      )}
    </PageShell>
  );
}
