"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Workflow } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

import { Padded } from "@/components/ds/layout/padded";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { EmptyState } from "@/components/ds/ui/misc";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

const FLOWS_ORIGIN = (process.env.NEXT_PUBLIC_FLOWS_URL || "https://flows.alisamadii.com").replace(/\/$/, "");

/**
 * Automations: Flows (workflows, cron jobs, notifications) embedded edge to
 * edge. The api mints a one-time link for this project only; Flows pins the
 * iframe session to the project's workspace. A new link is fetched whenever
 * the project changes or Flows reports its session ended.
 */
export function AutomationsPage() {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const [url, setUrl] = useState<string | null>(null);
  const embed = useMutation(trpc.automations.embedUrl.mutationOptions());
  const { mutate } = embed;
  const lastProject = useRef<string | null>(null);

  const open = useCallback(() => {
    if (!projectId) return;
    setUrl(null);
    mutate({ projectId }, { onSuccess: (data) => setUrl(data.url) });
  }, [mutate, projectId]);

  // New project (or first visit): new link.
  useEffect(() => {
    if (projectId && lastProject.current !== projectId) {
      lastProject.current = projectId;
      open();
    }
  }, [open, projectId]);

  // Flows asks for a fresh link when its session ends. Only trust the Flows origin.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== FLOWS_ORIGIN) return;
      const data = event.data as { source?: string; type?: string } | null;
      if (data?.source === "flows" && data.type === "session-expired") open();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open]);

  if (embed.isError) {
    return (
      <Padded>
        <Card>
          <EmptyState
            icon={<Workflow className="size-5" />}
            title="Automations couldn't load"
            text={handleCmsError(embed.error, "Something went wrong opening Automations.")}
            action={
              <Button variant="outline" onClick={open}>
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
      {!url && (
        <div className="absolute inset-0 grid place-items-center text-sm text-dim" aria-live="polite">
          Opening Automations…
        </div>
      )}
      {url && (
        <iframe
          key={url}
          src={url}
          title="Automations"
          className="absolute inset-0 size-full border-0"
          allow="clipboard-write"
          referrerPolicy="strict-origin"
        />
      )}
    </div>
  );
}
