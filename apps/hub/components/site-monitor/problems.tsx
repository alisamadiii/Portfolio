"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { AlertTriangle, Bell, BellOff, CheckCircle2, CircleAlert, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import {
  checkTypeLabel,
  pagePath,
  problemsForAi,
  type SitewatchIncident,
} from "@workspace/trpc/lib/sitewatch-shared";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { Badge } from "@/components/ds/ui/badge";
import { Button, IconButton } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { EmptyState } from "@/components/ds/ui/misc";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import type { MonitoredOverview } from "./site-monitor-page";

const copy = (text: string) =>
  navigator.clipboard.writeText(text).then(
    () => toast.success("Copied. Paste it into your AI assistant."),
    () => toast.error("Couldn't copy.")
  );

/** Problems tab: open errors and warnings, plus muted ones (collapsed). */
export function SiteMonitorProblems({ overview }: { overview: MonitoredOverview }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const problems = useQuery(trpc.siteMonitor.problems.queryOptions({ projectId }));
  const [showMuted, setShowMuted] = useState(false);

  if (problems.isPending) return <Skeleton className="h-[320px] rounded-card" />;
  if (problems.isError) {
    return (
      <Card>
        <EmptyState
          icon={<AlertTriangle className="size-5" />}
          title="Couldn't load problems"
          text={handleCmsError(problems.error, "Try again in a moment.")}
        />
      </Card>
    );
  }

  const active = problems.data.filter((p) => !p.ignoredAt);
  const muted = problems.data.filter((p) => p.ignoredAt);
  const errors = active.filter((p) => p.severity === "error");
  const warnings = active.filter((p) => p.severity === "warning");

  return (
    <div className="flex flex-col gap-5">
      {active.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            icon={<Sparkles className="size-4" aria-hidden />}
            onClick={() => copy(problemsForAi(overview.site, active))}
          >
            Copy all for AI
          </Button>
        </div>
      )}

      {active.length === 0 && (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="size-5" />}
            title="No problems found"
            text="Your website passed every check. We'll let you know here if anything breaks."
          />
        </Card>
      )}

      {errors.length > 0 && (
        <ProblemGroup
          title="Errors"
          icon={<CircleAlert className="size-4 text-danger" aria-hidden />}
          items={errors}
          overview={overview}
        />
      )}
      {warnings.length > 0 && (
        <ProblemGroup
          title="Warnings"
          icon={<AlertTriangle className="size-4 text-warning" aria-hidden />}
          items={warnings}
          overview={overview}
        />
      )}

      {muted.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowMuted((v) => !v)}
            className="self-start text-[13px] font-medium text-coral-text hover:text-coral-deep"
          >
            {showMuted ? "Hide" : "Show"} muted problems ({muted.length})
          </button>
          {showMuted && (
            <ProblemGroup
              title="Muted"
              icon={<BellOff className="size-4 text-dim" aria-hidden />}
              items={muted}
              overview={overview}
              muted
            />
          )}
        </div>
      )}
    </div>
  );
}

function ProblemGroup({
  title,
  icon,
  items,
  overview,
  muted,
}: {
  title: string;
  icon: React.ReactNode;
  items: SitewatchIncident[];
  overview: MonitoredOverview;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardHeader
        divided
        title={
          <span className="flex items-center gap-2">
            {icon}
            {title} ({items.length})
          </span>
        }
        action={
          !muted && (
            <Button
              size="sm"
              variant="subtle"
              icon={<Sparkles className="size-4" aria-hidden />}
              onClick={() => copy(problemsForAi(overview.site, items))}
            >
              Copy for AI
            </Button>
          )
        }
      />
      <div className="flex flex-col">
        {items.map((p) => (
          <ProblemRow key={p.id} problem={p} overview={overview} muted={muted} />
        ))}
      </div>
    </Card>
  );
}

function ProblemRow({
  problem,
  overview,
  muted,
}: {
  problem: SitewatchIncident;
  overview: MonitoredOverview;
  muted?: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();

  const setMuted = useMutation(
    trpc.siteMonitor.setMuted.mutationOptions({
      onSuccess: async () => {
        toast.success(muted ? "Problem un-muted." : "Problem muted. We won't alert you about it again.");
        await queryClient.invalidateQueries({ queryKey: trpc.siteMonitor.problems.queryKey({ projectId }) });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't update the problem.")),
    })
  );

  return (
    <div className="flex items-start justify-between gap-4 border-b border-divider px-6 py-3.5 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-sm font-medium">{problem.message}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge>{checkTypeLabel(problem.checkType)}</Badge>
          <span className="truncate text-[13px] text-dim">{pagePath(problem.pageUrl, overview.site.baseUrl)}</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="mr-2 hidden text-[13px] text-faint sm:inline">
          since {formatDistanceToNowStrict(parseISO(problem.firstSeenAt), { addSuffix: true })}
        </span>
        <IconButton aria-label="Copy for AI" title="Copy for AI" onClick={() => copy(problemsForAi(overview.site, [problem]))}>
          <Copy className="size-4" />
        </IconButton>
        {overview.access.canAct && (
          <IconButton
            aria-label={muted ? "Un-mute" : "Mute"}
            title={muted ? "Un-mute" : "Mute"}
            disabled={setMuted.isPending}
            onClick={() => setMuted.mutate({ projectId, incidentId: problem.id, muted: !muted })}
          >
            {muted ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          </IconButton>
        )}
      </div>
    </div>
  );
}
