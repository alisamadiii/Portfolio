"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";

import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { Input } from "@/components/ds/ui/field";
import { IconTile } from "@/components/ds/ui/misc";
import { useProject } from "@/hooks/use-project";
import { useProjectId } from "@/hooks/use-repo";
import { clearWebsiteUrlCache } from "@/hooks/use-website-url";
import { handleCmsError } from "@/lib/trpc-errors";

import type { Overview } from "./site-monitor-page";

const CHECKS = [
  "Uptime every few minutes, with an alert when your site goes down",
  "Broken pages, images, links and forms",
  "Speed, SEO and security issues",
  "SSL certificate and domain expiry dates",
];

/**
 * Not monitored yet. No website on the project: ask for it, save it on the
 * project and start monitoring in one step. Website saved: one click.
 */
export function SetupCard({ overview }: { overview: Extract<Overview, { state: "no-domain" | "not-monitored" }> }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const project = useProject();
  const [url, setUrl] = useState("");

  const needsDomain = overview.state === "no-domain";
  const canStart = needsDomain ? overview.access.canEditDomain : overview.access.canConnect;

  const connect = useMutation(
    trpc.siteMonitor.connect.mutationOptions({
      onSuccess: async (result) => {
        toast.success(
          result.created ? "Monitoring started. The first check is running now." : "Your website is already monitored."
        );
        // The website address may have changed: refresh the project too.
        clearWebsiteUrlCache(project?.owner, project?.repo);
        await queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't start monitoring.")),
    })
  );

  return (
    <Card>
      <div className="flex flex-col gap-5 px-6 py-6">
        <div className="flex items-start gap-4">
          <IconTile>
            <Activity className="size-5" />
          </IconTile>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">
              {needsDomain ? "Add your website to start monitoring" : "Start monitoring your website"}
            </h2>
            <p className="text-sm text-dim">
              {needsDomain
                ? "Enter your live website address. We save it on this project and start checking it right away."
                : `We'll start checking ${overview.websiteUrl?.replace(/^https?:\/\//, "")} right away.`}
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2 text-sm text-ink-3">
          {CHECKS.map((c) => (
            <li key={c} className="flex items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-coral" aria-hidden />
              {c}
            </li>
          ))}
        </ul>

        {!canStart ? (
          <p className="text-[13px] text-dim">Ask the project owner to turn on Site Monitor.</p>
        ) : needsDomain ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) connect.mutate({ projectId, websiteUrl: url.trim() });
            }}
          >
            <Input
              placeholder="www.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="min-w-56 max-w-md flex-1"
              aria-label="Website address"
            />
            <Button type="submit" variant="primary" disabled={!url.trim() || connect.isPending}>
              {connect.isPending ? "Starting…" : "Start monitoring"}
            </Button>
          </form>
        ) : (
          <div>
            <Button variant="primary" disabled={connect.isPending} onClick={() => connect.mutate({ projectId })}>
              {connect.isPending ? "Starting…" : "Start monitoring"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
