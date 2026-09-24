"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import {
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  Rocket,
  RotateCw,
  Sparkles,
} from "@/components/icon";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";

type Job = RouterOutputs["cms"]["aiEdits"]["listJobs"][number];

// Status → label + pill styles. Mirrors the content-pilot job statuses.
const STATUS: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  queued: {
    label: "Queued",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  running: {
    label: "Building",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    dot: "bg-blue-500 animate-pulse",
  },
  done: {
    label: "Ready",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    className:
      "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    dot: "bg-red-500",
  },
  canceled: {
    label: "Canceled",
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
};

const relTime = (iso: string | null) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export function DeploymentsMode() {
  const trpc = useTRPC();
  const { owner, repo } = useCanvasEditor();

  const jobsQuery = useQuery(
    trpc.cms.aiEdits.listJobs.queryOptions(
      { owner, repo },
      {
        enabled: Boolean(owner && repo),
        staleTime: 30_000,
        // Keep polling while anything is still in flight.
        refetchInterval: (query) => {
          const jobs = (query.state.data ?? []) as Job[];
          return jobs.some(
            (job) => job.status === "queued" || job.status === "running"
          )
            ? 10_000
            : false;
        },
      }
    )
  );

  const jobs = jobsQuery.data ?? [];

  return (
    <div className="bg-shell flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-1 flex items-center gap-2">
          <Rocket className="size-5" />
          <h1 className="text-lg font-semibold">Deployments</h1>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh deployments"
            className="ml-auto"
            disabled={jobsQuery.isFetching}
            onClick={() => jobsQuery.refetch()}
          >
            <RotateCw
              className={cn("size-4", jobsQuery.isFetching && "animate-spin")}
            />
          </Button>
        </div>
        <p className="text-muted-foreground mb-6 text-sm">
          Every AI edit made to this site — what was asked, what changed, and the
          resulting publish.
        </p>

        {jobsQuery.isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading deployments…
          </div>
        ) : jobsQuery.isError ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 py-12 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200">
            <AlertTriangle className="size-5" />
            AI deployments aren&apos;t available right now.
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-16 text-sm">
            <Sparkles className="size-6" />
            No AI edits yet. Click any text or image on your site to make one.
          </div>
        ) : (
          <ol className="space-y-3">
            {jobs.map((job) => (
              <DeploymentCard
                key={job.id}
                job={job}
                owner={owner}
                repo={repo}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function DeploymentCard({
  job,
  owner,
  repo,
}: {
  job: Job;
  owner: string;
  repo: string;
}) {
  const status = STATUS[job.status] ?? {
    label: job.status,
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/60",
  };
  // The AI's reply: a summary on success, the client-facing error otherwise.
  const reply = job.resultSummary ?? job.error;

  return (
    <li className="bg-card rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
        >
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <span className="text-muted-foreground text-xs">
          {relTime(job.finishedAt ?? job.createdAt)}
          {job.requestedBy ? ` · ${job.requestedBy}` : ""}
        </span>
      </div>

      {/* Request → reply, chat-style */}
      <div className="space-y-2 text-sm">
        <div>
          <div className="text-muted-foreground mb-0.5 text-xs font-medium">
            Request
          </div>
          <p>{job.prompt}</p>
        </div>
        {reply && (
          <div>
            <div className="text-muted-foreground mb-0.5 flex items-center gap-1 text-xs font-medium">
              <Sparkles className="size-3" />
              AI
            </div>
            <p className="text-muted-foreground">{reply}</p>
          </div>
        )}
      </div>

      {job.commitSha && (
        <div className="text-muted-foreground mt-3 border-t pt-3 text-xs">
          <a
            href={`https://github.com/${owner}/${repo}/commit/${job.commitSha}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground inline-flex items-center gap-1 font-medium"
          >
            {job.commitSha.slice(0, 7)}
            <ArrowUpRight className="size-3" />
          </a>
        </div>
      )}
    </li>
  );
}
