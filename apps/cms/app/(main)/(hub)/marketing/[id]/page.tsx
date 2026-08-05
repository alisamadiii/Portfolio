"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  ArrowLeft,
  Ban,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { DataTable } from "@workspace/ui/custom/data-table";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { apiFetch } from "@/lib/query";

import { DocumentTitle } from "@/components/document-title";
import { STATUS_PILL } from "@/components/marketing/status";

const PAGE_SIZE = 25;

const RECIPIENT_PILL: Record<string, string> = {
  sent: "bg-status-success-bg text-status-success",
  pending: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
  suppressed: "bg-status-warning-bg text-status-warning",
};

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [acting, setActing] = useState(false);

  const { data: campaign, error } = useQuery(
    trpc.marketing.campaigns.get.queryOptions(
      { id },
      {
        // Live progress while the workflow runs; stops polling once settled.
        refetchInterval: (query) => {
          const status = query.state.data?.status;
          return status === "sending" || status === "paused" ? 2000 : false;
        },
      }
    )
  );

  const { data: recipients, isLoading: recipientsLoading } = useQuery(
    trpc.marketing.campaigns.recipients.queryOptions(
      {
        campaignId: id,
        status:
          statusFilter === "all"
            ? undefined
            : (statusFilter as "pending" | "sent" | "failed" | "suppressed"),
        page,
        limit: PAGE_SIZE,
      },
      {
        enabled: !!campaign && campaign.status !== "draft",
        placeholderData: keepPreviousData,
        refetchInterval:
          campaign?.status === "sending" || campaign?.status === "paused"
            ? 5000
            : false,
      }
    )
  );

  const act = async (action: "pause" | "resume" | "cancel") => {
    setActing(true);
    try {
      await apiFetch(`/api/marketing/campaigns/${id}/${action}`, {
        method: "POST",
      });
      await queryClient.invalidateQueries({
        queryKey: trpc.marketing.campaigns.get.queryKey({ id }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.marketing.campaigns.list.queryKey(),
      });
    } catch (err) {
      if (err instanceof Error && err.message) toast.error(err.message);
    } finally {
      setActing(false);
      setConfirmCancel(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <DocumentTitle title="Campaign" />
        <div className="border-destructive/40 bg-destructive/5 rounded-lg border py-14 text-center">
          <p className="text-muted-foreground text-[14.5px]">{error.message}</p>
        </div>
      </div>
    );
  }
  if (!campaign) return null;

  const counts = campaign.counts;
  const doneCount = counts.sent + counts.failed + counts.suppressed;
  const progressPct =
    campaign.recipientCount > 0
      ? Math.round((doneCount / campaign.recipientCount) * 100)
      : 0;
  const pill = STATUS_PILL[campaign.status] ?? STATUS_PILL.draft!;
  const isActive =
    campaign.status === "sending" || campaign.status === "paused";

  const tiles = [
    { label: "Sent", value: counts.sent, className: "text-status-success" },
    { label: "Pending", value: counts.pending, className: "" },
    { label: "Failed", value: counts.failed, className: "text-destructive" },
    {
      label: "Suppressed",
      value: counts.suppressed,
      className: "text-status-warning",
    },
  ];

  return (
    <div className="space-y-6">
      <DocumentTitle title={campaign.name} />
      <div>
        <Link
          href="/marketing"
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="size-4" />
          Marketing
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[27px] font-extrabold tracking-tight">
            {campaign.name}
          </h2>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
              pill.className
            )}
          >
            {pill.label}
          </span>
        </div>
        <p className="text-muted-foreground mt-1 text-[14.5px]">
          &ldquo;{campaign.subject}&rdquo;
          {campaign.startedAt &&
            ` · started ${formatDistanceToNowStrict(
              new Date(campaign.startedAt),
              { addSuffix: true }
            )}`}
          {campaign.completedAt &&
            ` · finished ${format(
              new Date(campaign.completedAt),
              "MMM d, yyyy h:mm a"
            )}`}
        </p>
      </div>

      {isActive && (
        <div className="flex items-center gap-2">
          {campaign.status === "sending" ? (
            <Button
              variant="outline"
              className="rounded-full"
              disabled={acting}
              onClick={() => void act("pause")}
            >
              <Pause className="size-4" />
              Pause
            </Button>
          ) : (
            <Button
              className="rounded-full"
              disabled={acting}
              onClick={() => void act("resume")}
            >
              <Play className="size-4" />
              Resume
            </Button>
          )}
          <Button
            variant="outline"
            className="text-destructive rounded-full"
            disabled={acting}
            onClick={() => setConfirmCancel(true)}
          >
            <Ban className="size-4" />
            Cancel
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-lg border px-4 py-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {tile.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-extrabold tabular-nums",
                  tile.className
                )}
              >
                {tile.value}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progressPct} className="h-2 flex-1" />
          <span className="text-muted-foreground text-sm font-medium tabular-nums">
            {doneCount}/{campaign.recipientCount} · {progressPct}%
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">Recipients</h3>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v ?? "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 rounded-full px-4">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="suppressed">Suppressed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          className="table-card"
          isLoading={recipientsLoading && PAGE_SIZE}
          columns={[
            {
              id: "email",
              header: "Email",
              cell: ({ row }) => (
                <span className="block max-w-[280px] truncate text-sm font-medium">
                  {row.original.email}
                </span>
              ),
            },
            {
              id: "status",
              header: "Status",
              cell: ({ row }) => (
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap capitalize",
                    RECIPIENT_PILL[row.original.status]
                  )}
                >
                  {row.original.status}
                </span>
              ),
            },
            {
              id: "detail",
              header: "Detail",
              cell: ({ row }) => (
                <span className="text-muted-foreground block max-w-[320px] truncate text-sm">
                  {row.original.error ?? ""}
                </span>
              ),
            },
            {
              id: "sent",
              header: () => <div className="text-right">Sent</div>,
              cell: ({ row }) => (
                <div className="text-muted-foreground text-right text-sm whitespace-nowrap">
                  {row.original.sentAt
                    ? format(new Date(row.original.sentAt), "h:mm:ss a")
                    : "—"}
                </div>
              ),
            },
          ]}
          data={recipients?.items ?? []}
        />

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {(recipients?.total ?? 0) > 0
              ? `Showing ${page * PAGE_SIZE + 1}–${Math.min(
                  (page + 1) * PAGE_SIZE,
                  recipients?.total ?? 0
                )} of ${recipients?.total}`
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
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={(page + 1) * PAGE_SIZE >= (recipients?.total ?? 0)}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Sending stops immediately. Emails already delivered can&apos;t be
              recalled, and a canceled campaign can&apos;t be restarted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={acting}
              onClick={() => setConfirmCancel(false)}
            >
              Keep sending
            </Button>
            <Button
              variant="destructive"
              disabled={acting}
              onClick={() => void act("cancel")}
            >
              {acting ? "Canceling…" : "Cancel campaign"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
