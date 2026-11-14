"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ExternalLink, RefreshCw, Rocket } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge, type BadgeTone } from "@/components/ds/ui/badge";
import { Button, ButtonAnchor } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { EmptyState, InfoStrip } from "@/components/ds/ui/misc";
import { UnderlineTabs } from "@/components/ds/ui/tabs";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import { NetlifyDomains } from "./netlify-domains";
import { NetlifyPlan } from "./netlify-plan";
import { NetlifySettings } from "./netlify-settings";

type Overview = NonNullable<RouterOutputs["netlify"]["overview"]>;
type Deploy = Overview["deploys"][number];
type Job = NonNullable<Overview["job"]>;

const ago = (iso: string | null) =>
  iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true }) : "—";

const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

// Netlify deploy states → badge. Anything in flight reads as "Deploying".
const deployBadge = (state: string): { tone: BadgeTone; label: string } => {
  if (state === "ready") return { tone: "success", label: "Published" };
  if (state === "error") return { tone: "coral", label: "Failed" };
  if (state === "rejected" || state === "skipped") return { tone: "neutral", label: "Skipped" };
  return { tone: "info", label: "Deploying" };
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "domains", label: "Domains" },
  { id: "settings", label: "Settings" },
];

const jobRunning = (job: Job | null) =>
  !!job && ["queued", "building", "uploading"].includes(job.status);

const JOB_LABEL: Record<Job["status"], string> = {
  queued: "Waiting to build",
  building: "Building your site",
  uploading: "Uploading to Netlify",
  ready: "Deployed",
  error: "Deploy failed",
  skipped: "Replaced by a newer publish",
};

const columns: Column<Deploy>[] = [
  {
    key: "status",
    header: "Status",
    width: "130px",
    cell: (d) => {
      const b = deployBadge(d.state);
      return (
        <Badge tone={b.tone} dot>
          {b.label}
        </Badge>
      );
    },
  },
  {
    key: "when",
    header: "Started",
    cell: (d) => <span className="text-ink">{ago(d.createdAt)}</span>,
  },
  {
    key: "time",
    header: "Duration",
    width: "110px",
    cell: (d) => (d.deployTime != null ? `${d.deployTime}s` : "—"),
  },
  {
    key: "link",
    header: "",
    width: "120px",
    align: "end",
    cell: (d) =>
      d.url ? (
        <a
          href={d.url}
          target="_blank"
          rel="noreferrer"
          className="text-[13px] font-medium text-coral-text hover:text-coral-deep"
        >
          View deploy
        </a>
      ) : null,
  },
];

/** Netlify hosting of an upload project: live URL, latest build and recent deploys. */
export function NetlifyPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const project = useProject();
  const canDeploy = project?.role === "full-access";

  const overview = useQuery({
    ...trpc.netlify.overview.queryOptions({ projectId }),
    // Poll while a build is running, or Netlify is still processing the upload.
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const processing = data.deploys[0] && deployBadge(data.deploys[0].state).label === "Deploying";
      return jobRunning(data.job) || processing ? 5000 : false;
    },
  });

  const redeploy = useMutation(
    trpc.netlify.redeploy.mutationOptions({
      onSuccess: () => {
        toast.success("Deploy started.");
        void queryClient.invalidateQueries({
          queryKey: trpc.netlify.overview.queryKey({ projectId }),
        });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't start the deploy.")),
    })
  );

  const data = overview.data;
  const running = jobRunning(data?.job ?? null);
  const [confirmRedeploy, setConfirmRedeploy] = useState(false);
  const [tab, setTab] = useState("overview");

  const header = (
    <PageHeader
      title="Netlify"
      description="Where your website is hosted. Every publish builds the site and deploys it here."
      actions={
        data && (
          <>
            {!data.ownedByAgency && (
              <ButtonAnchor
                href={data.site.adminUrl}
                target="_blank"
                rel="noreferrer"
                icon={<ExternalLink className="size-4" />}
              >
                Open in Netlify
              </ButtonAnchor>
            )}
            {canDeploy && (
              <Button
                onClick={() => setConfirmRedeploy(true)}
                disabled={running || redeploy.isPending}
                icon={<RefreshCw className="size-4" />}
              >
                Redeploy
              </Button>
            )}
            <ConfirmDialog
              open={confirmRedeploy}
              onOpenChange={setConfirmRedeploy}
              title="Redeploy the live site?"
              description="The current published version is rebuilt and replaces what's live on Netlify. It takes a minute or two."
              confirmLabel="Redeploy"
              onConfirm={() => redeploy.mutate({ projectId })}
            />
          </>
        )
      }
    />
  );

  if (overview.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-[68px] rounded-card" />
        <Skeleton className="h-[320px] rounded-card" />
      </div>
    );
  }

  if (overview.isError || !data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <EmptyState
            icon={<Rocket className="size-5" />}
            title={overview.isError ? "Couldn't load Netlify" : "Not on Netlify yet"}
            text={
              overview.isError
                ? handleCmsError(overview.error, "Netlify didn't answer. Try again in a moment.")
                : "Publish your website from the editor and it will be deployed to Netlify."
            }
          />
        </Card>
      </div>
    );
  }

  const { site, job } = data;
  return (
    <div className="flex flex-col gap-6">
      {header}

      <InfoStrip
        items={[
          {
            label: "Live site",
            value: (
              <a
                href={site.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-coral-text hover:text-coral-deep"
              >
                {host(site.url)}
              </a>
            ),
          },
          {
            label: "Custom domain",
            value: <span className="text-dim">{site.customDomain ?? "—"}</span>,
          },
          {
            label: "HTTPS",
            value: <span className="text-dim">{site.ssl ? "On" : site.ssl === false ? "Off" : "—"}</span>,
          },
          {
            label: "Last published",
            value: <span className="text-dim">{ago(site.publishedAt)}</span>,
          },
        ]}
      />

      <UnderlineTabs label="Netlify sections" items={TABS} value={tab} onChange={setTab} />

      {tab === "overview" && (
        <>
          {job && (running || job.status === "error") && (
            <Card className="flex flex-col gap-1.5 px-6 py-4">
              <div className="flex items-center gap-3">
                <Badge tone={job.status === "error" ? "coral" : "info"} dot>
                  {JOB_LABEL[job.status]}
                </Badge>
                <span className="text-[13px] text-dim">{ago(job.createdAt)}</span>
              </div>
              {job.error && <p className="text-[13px] leading-normal text-ink-3">{job.error}</p>}
            </Card>
          )}

          <Card>
            <CardHeader title="Recent deploys" divided />
            <DataTable
              columns={columns}
              rows={data.deploys}
              rowKey={(d) => d.id}
              minWidth={520}
              empty={<p className="px-6 py-8 text-center text-[13px] text-dim">No deploys yet.</p>}
            />
          </Card>
          <NetlifyPlan />
        </>
      )}
      {tab === "domains" && <NetlifyDomains canEdit={canDeploy} />}
      {tab === "settings" && <NetlifySettings canEdit={canDeploy} />}
    </div>
  );
}
