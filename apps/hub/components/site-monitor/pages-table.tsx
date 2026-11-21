"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";
import { pagePath, type SitewatchPage } from "@workspace/trpc/lib/sitewatch-shared";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { Badge } from "@/components/ds/ui/badge";
import { Card } from "@/components/ds/ui/card";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { EmptyState } from "@/components/ds/ui/misc";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import type { MonitoredOverview } from "./site-monitor-page";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Pages tab: every page found on the site, with problems from the latest check. */
export function SiteMonitorPages({ overview }: { overview: MonitoredOverview }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const pages = useQuery(trpc.siteMonitor.pages.queryOptions({ projectId }));

  if (pages.isPending) return <Skeleton className="h-[320px] rounded-card" />;

  const columns: Column<SitewatchPage>[] = [
    {
      key: "page",
      header: "Page",
      cell: (p) => (
        <a
          href={p.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-ink hover:text-coral-text"
        >
          {pagePath(p.url, overview.site.baseUrl)}
        </a>
      ),
    },
    {
      key: "check",
      header: "Last check",
      width: "200px",
      align: "end",
      cell: (p) =>
        !p.problems ? (
          <span className="text-faint">No problems</span>
        ) : (
          <span className="flex gap-1.5">
            {p.problems.errors > 0 && <Badge tone="coral">{plural(p.problems.errors, "error")}</Badge>}
            {p.problems.warnings > 0 && <Badge tone="warning">{plural(p.problems.warnings, "warning")}</Badge>}
          </span>
        ),
    },
  ];

  return (
    <Card className="overflow-hidden">
      <DataTable
        columns={columns}
        rows={pages.data ?? []}
        rowKey={(p) => p.url}
        minWidth={480}
        empty={
          <EmptyState
            icon={<FileText className="size-5" />}
            title={pages.isError ? "Couldn't load pages" : "No pages yet"}
            text={
              pages.isError
                ? handleCmsError(pages.error, "Try again in a moment.")
                : "Pages show up here after the first check finishes."
            }
          />
        }
      />
    </Card>
  );
}
