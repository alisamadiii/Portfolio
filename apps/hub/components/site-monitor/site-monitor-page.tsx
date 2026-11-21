"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Activity, ExternalLink, Play } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeader } from "@/components/ds/layout/page-header";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { EmptyState } from "@/components/ds/ui/misc";
import { UnderlineTabs } from "@/components/ds/ui/tabs";
import { useProjectId } from "@/hooks/use-repo";
import { appPath } from "@/lib/paths";
import { handleCmsError } from "@/lib/trpc-errors";

import { SiteMonitorDashboard } from "./dashboard";
import { SiteMonitorHistory } from "./history-table";
import { SiteMonitorPages } from "./pages-table";
import { SiteMonitorProblems } from "./problems";
import { SetupCard } from "./setup-card";

export type SiteMonitorTab = "dashboard" | "problems" | "pages" | "history";
export type Overview = RouterOutputs["siteMonitor"]["overview"];
export type MonitoredOverview = Extract<Overview, { state: "ok" }>;

const TABS: { id: SiteMonitorTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "problems", label: "Problems" },
  { id: "pages", label: "Pages" },
  { id: "history", label: "History" },
];

const DESCRIPTION = "We check your website around the clock: uptime, broken pages, speed, SEO and more.";

/** Site Monitor: the project's website as seen by sitewatch, one tab per route. */
export function SiteMonitorPage({ tab }: { tab: SiteMonitorTab }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const overview = useQuery(trpc.siteMonitor.overview.queryOptions({ projectId }));

  if (overview.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Site Monitor" description={DESCRIPTION} docs="client-hub/site-monitor" />
        <Skeleton className="h-[120px] rounded-card" />
        <Skeleton className="h-[320px] rounded-card" />
      </div>
    );
  }
  if (overview.isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Site Monitor" description={DESCRIPTION} docs="client-hub/site-monitor" />
        <Card>
          <EmptyState
            icon={<Activity className="size-5" />}
            title="Couldn't load Site Monitor"
            text={handleCmsError(overview.error, "Try again in a moment.")}
          />
        </Card>
      </div>
    );
  }

  const data = overview.data;
  if (data.state !== "ok") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Site Monitor" description={DESCRIPTION} docs="client-hub/site-monitor" />
        {data.state === "unconfigured" ? (
          <Card>
            <EmptyState
              icon={<Activity className="size-5" />}
              title="Site Monitor isn't set up yet"
              text="We're still connecting the monitor. Check back soon."
            />
          </Card>
        ) : (
          <SetupCard overview={data} />
        )}
      </div>
    );
  }

  return <Monitored overview={data} tab={tab} />;
}

function Monitored({ overview, tab }: { overview: MonitoredOverview; tab: SiteMonitorTab }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const { site } = overview;
  const domain = site.baseUrl.replace(/^https?:\/\//, "");

  const run = useMutation(
    trpc.siteMonitor.runCheck.mutationOptions({
      onSuccess: async (result) => {
        toast.success(
          result.skipped
            ? "A check is already running. Results show in History when it's done."
            : "Check started. Results show in History in a few minutes."
        );
        await queryClient.invalidateQueries({ queryKey: trpc.siteMonitor.history.queryKey({ projectId }) });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't start the check.")),
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={site.name}
        description={
          <a
            href={site.baseUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-coral-text hover:text-coral-deep"
          >
            {domain}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        }
        actions={
          overview.access.canAct && (
            <Button
              variant="primary"
              icon={<Play className="size-4" aria-hidden />}
              disabled={run.isPending}
              onClick={() => run.mutate({ projectId })}
            >
              {run.isPending ? "Starting…" : "Run check now"}
            </Button>
          )
        }
        tabs={
          <UnderlineTabs
            label="Site Monitor"
            items={TABS}
            value={tab}
            onChange={(id) => router.push(appPath("site-monitor", id === "dashboard" ? "" : id))}
          />
        }
      />
      {tab === "dashboard" && <SiteMonitorDashboard overview={overview} />}
      {tab === "problems" && <SiteMonitorProblems overview={overview} />}
      {tab === "pages" && <SiteMonitorPages overview={overview} />}
      {tab === "history" && <SiteMonitorHistory />}
    </div>
  );
}
