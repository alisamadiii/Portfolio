"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Workflow } from "lucide-react";

import { trpcClient } from "@workspace/trpc/client";

import { Padded } from "@/components/ds/layout/padded";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { EmptyState } from "@/components/ds/ui/misc";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

const FLOWS_ORIGIN = (process.env.NEXT_PUBLIC_FLOWS_URL || "https://flows.alisamadii.com").replace(/\/$/, "");
// Flows keeps an embed session for 8 hours; keep the cached link around that long.
const SESSION_MS = 8 * 60 * 60 * 1000;

// One-time links already handed to an iframe (they can't be opened twice).
const opened = new Set<string>();

const embedKey = (projectId: string | null) => ["automations", "embed", projectId] as const;

/**
 * Automations: Flows (workflows, cron jobs, notifications) embedded edge to
 * edge. The api mints a one-time link for this project only; Flows trades it
 * for a session pinned to the project's workspace.
 *
 * The link is cached per project (React Query). Coming back to this page
 * reopens Flows through /iframe/resume?w=<workspace>, which reuses the existing
 * session without asking the api again. Only when that session is gone (8h) or
 * belongs to another project does Flows post `session-expired`, and then one
 * fresh link is fetched.
 */
export function AutomationsPage() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  const embed = useQuery({
    queryKey: embedKey(projectId),
    queryFn: () => trpcClient.automations.embedUrl.mutate({ projectId: projectId! }),
    enabled: Boolean(projectId),
    staleTime: SESSION_MS,
    gcTime: SESSION_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Links already used when this page mounted are reopened through /iframe/resume;
  // a link that arrives later (first visit, renewal) is fresh and opened directly.
  const [usedAtMount] = useState(() => new Set(opened));
  const data = embed.data;
  const src = data
    ? usedAtMount.has(data.url)
      ? `${FLOWS_ORIGIN}/iframe/resume?w=${encodeURIComponent(data.workspaceId)}`
      : data.url
    : null;
  useEffect(() => {
    if (data?.url) opened.add(data.url);
  }, [data?.url]);

  const renew = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: embedKey(projectId) });
  }, [queryClient, projectId]);

  // Flows asks for a fresh link when its session ended. Only trust the Flows origin.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== FLOWS_ORIGIN) return;
      const msg = event.data as { source?: string; type?: string } | null;
      if (msg?.source === "flows" && msg.type === "session-expired") renew();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [renew]);

  if (embed.isError) {
    return (
      <Padded>
        <Card>
          <EmptyState
            icon={<Workflow className="size-5" />}
            title="Automations couldn't load"
            text={handleCmsError(embed.error, "Something went wrong opening Automations.")}
            action={
              <Button variant="outline" onClick={renew}>
                Try again
              </Button>
            }
          />
        </Card>
      </Padded>
    );
  }

  return (
    <div className="relative min-h-0 flex-1 bg-canvas">
      {!src && (
        <div className="absolute inset-0 grid place-items-center text-sm text-dim" aria-live="polite">
          Opening Automations…
        </div>
      )}
      {src && (
        <iframe
          key={src}
          src={src}
          title="Automations"
          className="absolute inset-0 size-full border-0"
          allow="clipboard-write"
          referrerPolicy="strict-origin"
        />
      )}
    </div>
  );
}
