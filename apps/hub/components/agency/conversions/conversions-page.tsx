"use client";

import { Fragment, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
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
import {
  categoryLabel,
  CONVERSION_PRESETS,
  MANAGED_TYPES,
  sourceLabel,
  STAGE_LABELS,
  TRACKING_LABELS,
  trackingStatus,
  UPLOAD_STAGES,
  type ConversionCategory,
  type UploadStage,
} from "@workspace/trpc/lib/agency/conversion-presets";

import { useCampaignFilter } from "@/components/agency/campaign-filter";
import { HoverInfo } from "@/components/agency/hover-info";
import {
  lastDays,
  RANGES,
  type RangeValue,
} from "@/components/agency/lead-status";
import { useAgency } from "@/components/agency/use-agency";
import { CircleCheck, Pencil, Plus, Sparkles, Trash } from "@/components/icon";

import { ConversionDialog, type EditableAction } from "./conversion-dialog";

const number = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });

const HEALTH_LABELS: Record<string, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  NEEDS_ATTENTION: "Needs attention",
  NO_RECENT_UPLOADS: "No recent uploads",
};

export function ConversionsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { repoId } = useAgency();
  const { campaignId } = useCampaignFilter();
  const [days, setDays] = useState<RangeValue>("30");
  const range = useMemo(() => lastDays(Number(days)), [days]);
  const [editing, setEditing] = useState<EditableAction | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<{
    resourceName: string;
    name: string;
  } | null>(null);

  const list = useQuery(
    trpc.agency.ads.conversions.list.queryOptions(
      { repoId, ...range },
      { placeholderData: keepPreviousData }
    )
  );
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.agency.ads.conversions.pathKey(),
    });

  const applyPreset = useMutation(
    trpc.agency.ads.conversions.applyPreset.mutationOptions({
      onSuccess: ({ created, reused }) => {
        toast.success(
          created
            ? `Tracking is ready: ${created} created${reused ? `, ${reused} already there` : ""}.`
            : "Tracking is ready: every action was already there and is now wired."
        );
        refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const remove = useMutation(
    trpc.agency.ads.conversions.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Conversion action removed.");
        setRemoving(null);
        refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const data = list.data;
  // Stage reported to each action, by resource name.
  const stageOf = useMemo(() => {
    const map = new Map<string, UploadStage | "calls">();
    for (const [stage, resourceName] of Object.entries(data?.wired ?? {})) {
      if (resourceName) map.set(resourceName, stage as UploadStage | "calls");
    }
    return map;
  }, [data?.wired]);

  // Google Ads groups actions by goal; primary goals first.
  const groups = useMemo(() => {
    const byCategory = new Map<string, NonNullable<typeof data>["actions"]>();
    for (const action of data?.actions ?? []) {
      byCategory.set(action.category, [
        ...(byCategory.get(action.category) ?? []),
        action,
      ]);
    }
    return [...byCategory.entries()].sort(
      ([, a], [, b]) =>
        Number(b.some((x) => x.primaryForGoal)) -
        Number(a.some((x) => x.primaryForGoal))
    );
  }, [data]);

  if (list.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (list.error)
    return <p className="text-destructive text-[14px]">{list.error.message}</p>;
  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="font-semibold">No Google Ads account linked yet</p>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Once your account is linked, its conversion actions show here.
        </p>
      </div>
    );
  }

  const preset = CONVERSION_PRESETS[0]!;
  const wiredCount = preset.actions.filter(
    (action) => data.wired[action.key]
  ).length;
  const totals = data.actions.reduce(
    (sum, action) => ({
      conversions: sum.conversions + action.allConversions,
      value: sum.value + action.allConversionsValue,
    }),
    { conversions: 0, value: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Preset */}
      <div
        className={cn(
          "rounded-2xl border p-5",
          wiredCount === preset.actions.length
            ? "bg-chart-2/6 border-chart-2/25"
            : "bg-card"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              {wiredCount === preset.actions.length ? (
                <CircleCheck className="text-chart-2 size-5" />
              ) : (
                <Sparkles className="size-5 text-[#fc8464]" />
              )}
              <h3 className="text-[16px] font-semibold">
                {wiredCount === preset.actions.length
                  ? "Lead tracking is ready"
                  : `Preset: ${preset.name}`}
              </h3>
            </div>
            <p className="text-muted-foreground mt-1 text-[14px]">
              {preset.description}
            </p>
          </div>
          {data.canManage && (
            <Button
              size="lg"
              className="text-sm md:px-4"
              variant={
                wiredCount === preset.actions.length ? "outline" : "default"
              }
              disabled={applyPreset.isPending}
              onClick={() =>
                applyPreset.mutate({ repoId, presetId: preset.id })
              }
            >
              {applyPreset.isPending
                ? "Setting up…"
                : wiredCount === preset.actions.length
                  ? "Re-apply preset"
                  : wiredCount
                    ? "Finish setup"
                    : "Apply preset"}
            </Button>
          )}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {preset.actions.map((action) => {
            const done = Boolean(data.wired[action.key]);
            const upload =
              action.key === "calls" ? null : data.uploads[action.key];
            return (
              <div
                key={action.key}
                className="bg-background rounded-xl border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold">
                    {action.name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      done
                        ? "bg-chart-2/15 text-chart-2"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {done ? "Ready" : "Not set up"}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-[12.5px]">
                  {action.description}
                </p>
                {done && upload && (
                  <p className="text-muted-foreground mt-2 text-[12px]">
                    {upload.count
                      ? `${upload.count} reported, last ${formatDistanceToNow(new Date(upload.lastAt!), { addSuffix: true })}`
                      : "Nothing reported yet"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Google's own report on how our uploads are processing */}
      {data.health.length > 0 && (
        <div className="bg-card rounded-2xl border p-5">
          <h3 className="text-[15px] font-semibold">Upload health</h3>
          <p className="text-muted-foreground mt-0.5 text-[13px]">
            How Google is processing the conversions the Hub reports.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {data.health.map((row) => (
              <div
                key={row.actionName}
                className="bg-background rounded-xl border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13.5px] font-medium">
                    {row.actionName}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      row.status === "EXCELLENT" || row.status === "GOOD"
                        ? "bg-chart-2/15 text-chart-2"
                        : row.status === "NEEDS_ATTENTION"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {HEALTH_LABELS[row.status] ?? "No recent uploads"}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1.5 text-[12.5px] tabular-nums">
                  {row.successful} of {row.total} accepted
                  {row.pending ? `, ${row.pending} processing` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-[14px]">
          {data.actions.length} conversion{" "}
          {data.actions.length === 1 ? "action" : "actions"} in your Google Ads
          account
          {campaignId &&
            ". Conversion actions are account-wide, so the campaign filter doesn't apply here."}
        </p>
        <div className="flex gap-2">
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
          {data.canManage && (
            <Button
              size="lg"
              className="text-sm md:px-4"
              onClick={() => setCreating(true)}
            >
              <Plus className="size-4" />
              New action
            </Button>
          )}
        </div>
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
              <TableHead className="pl-5">Conversion action</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Tracking status</TableHead>
              <TableHead>Optimization</TableHead>
              <TableHead>Count</TableHead>
              <TableHead>Click-through window</TableHead>
              <TableHead>In account goals</TableHead>
              <TableHead className="text-right">All conv.</TableHead>
              <TableHead className="text-right">All conv. value</TableHead>
              {data.canManage && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data.actions.length && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-muted-foreground py-10 text-center"
                >
                  No conversion actions yet. Apply the preset above to start
                  tracking.
                </TableCell>
              </TableRow>
            )}
            {groups.map(([category, actions]) => (
              <Fragment key={category}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell
                    colSpan={10}
                    className="text-muted-foreground pl-5 text-[12.5px] font-medium"
                  >
                    {categoryLabel(category)}
                    {actions.some((a) => a.primaryForGoal) &&
                      " (account-default goal)"}
                  </TableCell>
                </TableRow>
                {actions.map((action) => {
                  const stage = stageOf.get(action.resourceName);
                  const status = trackingStatus(action);
                  const managed = (MANAGED_TYPES as readonly string[]).includes(
                    action.type
                  );
                  return (
                    <TableRow key={action.resourceName}>
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              action.status === "ENABLED"
                                ? "bg-chart-2"
                                : "bg-muted-foreground/40"
                            )}
                          />
                          <span className="font-medium">{action.name}</span>
                          {stage && stage !== "calls" && (
                            <HoverInfo
                              title="Reported by the Hub"
                              content={
                                <p>
                                  Sent when: {STAGE_LABELS[stage].toLowerCase()}
                                  .
                                </p>
                              }
                            >
                              <span className="cursor-help rounded-full bg-[#fc8464]/14 px-2 py-0.5 text-[11px] font-semibold text-[#c2522f] dark:text-[#fc8464]">
                                Hub
                              </span>
                            </HoverInfo>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sourceLabel(action.type, action.origin)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-[13px]",
                            status === "recording"
                              ? "text-chart-2 font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {TRACKING_LABELS[status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {action.primaryForGoal ? "Primary" : "Secondary"}
                      </TableCell>
                      <TableCell>
                        {action.countingType === "MANY_PER_CLICK"
                          ? "Every"
                          : "One"}
                      </TableCell>
                      <TableCell>
                        {action.clickThroughLookbackWindowDays
                          ? `${action.clickThroughLookbackWindowDays} days`
                          : ""}
                      </TableCell>
                      <TableCell>
                        {action.includeInConversionsMetric ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {number(action.allConversions)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {number(action.allConversionsValue)}
                      </TableCell>
                      {data.canManage && (
                        <TableCell className="pr-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit ${action.name}`}
                              onClick={() =>
                                setEditing({
                                  resourceName: action.resourceName,
                                  type: action.type,
                                  name: action.name,
                                  category:
                                    action.category as ConversionCategory,
                                  countingType:
                                    action.countingType as EditableAction["countingType"],
                                  clickThroughLookbackWindowDays:
                                    action.clickThroughLookbackWindowDays || 30,
                                  primaryForGoal: action.primaryForGoal,
                                  defaultValue: action.defaultValue,
                                  stage:
                                    stage &&
                                    (
                                      UPLOAD_STAGES as readonly string[]
                                    ).includes(stage)
                                      ? (stage as UploadStage)
                                      : null,
                                })
                              }
                              disabled={!managed}
                              title={
                                managed ? undefined : "Managed in Google Ads"
                              }
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${action.name}`}
                              className="text-destructive"
                              onClick={() =>
                                setRemoving({
                                  resourceName: action.resourceName,
                                  name: action.name,
                                })
                              }
                            >
                              <Trash className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </Fragment>
            ))}
            {data.actions.length > 0 && (
              <TableRow className="bg-muted/40 hover:bg-muted/40 font-medium">
                <TableCell className="pl-5" colSpan={7}>
                  Total: all conversion actions
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {number(totals.conversions)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {number(totals.value)}
                </TableCell>
                {data.canManage && <TableCell />}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(creating || editing) && (
        <ConversionDialog
          key={editing?.resourceName ?? "new"}
          open
          action={editing}
          onOpenChange={(open) => {
            if (!open) {
              setCreating(false);
              setEditing(null);
            }
          }}
        />
      )}

      <AlertDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It&apos;s removed from Google Ads and stops counting. Past
              conversions stay in your reports, and the Hub stops reporting to
              it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => removing && remove.mutate({ repoId, ...removing })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
