"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { History } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";
import type { SitewatchRun } from "@workspace/trpc/lib/sitewatch-shared";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { Badge, type BadgeTone } from "@/components/ds/ui/badge";
import { Card } from "@/components/ds/ui/card";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { EmptyState } from "@/components/ds/ui/misc";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

const STATUS: Record<SitewatchRun["status"], { label: string; tone: BadgeTone }> = {
  running: { label: "Running", tone: "info" },
  ok: { label: "All good", tone: "success" },
  degraded: { label: "Warnings", tone: "warning" },
  failed: { label: "Errors", tone: "coral" },
  error: { label: "Check failed", tone: "neutral" },
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const columns: Column<SitewatchRun>[] = [
  {
    key: "when",
    header: "When",
    cell: (r) => formatDistanceToNowStrict(parseISO(r.startedAt), { addSuffix: true }),
  },
  {
    key: "status",
    header: "Status",
    cell: (r) => <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>,
  },
  {
    key: "pages",
    header: "Pages",
    cell: (r) => `${r.pagesChecked}/${r.pagesTotal}`,
  },
  {
    key: "problems",
    header: "Problems",
    align: "end",
    cell: (r) => {
      if (r.status === "running") return <span className="text-faint">—</span>;
      const parts = [
        r.errorCount > 0 && plural(r.errorCount, "error"),
        r.warningCount > 0 && plural(r.warningCount, "warning"),
      ].filter(Boolean);
      return parts.length ? parts.join(", ") : <span className="text-faint">None</span>;
    },
  },
];

/** History tab: every full check, newest first (kept 90 days). */
export function SiteMonitorHistory() {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const history = useQuery({
    ...trpc.siteMonitor.history.queryOptions({ projectId }),
    // A running check finishes in a few minutes: keep the row fresh.
    refetchInterval: (query) => (query.state.data?.some((r) => r.status === "running") ? 15_000 : false),
  });

  if (history.isPending) return <Skeleton className="h-[320px] rounded-card" />;

  return (
    <Card className="overflow-hidden">
      <DataTable
        columns={columns}
        rows={history.data ?? []}
        rowKey={(r) => r.id}
        minWidth={560}
        empty={
          <EmptyState
            icon={<History className="size-5" />}
            title={history.isError ? "Couldn't load history" : "No checks yet"}
            text={
              history.isError
                ? handleCmsError(history.error, "Try again in a moment.")
                : "The first full check runs right after monitoring starts."
            }
          />
        }
      />
    </Card>
  );
}
