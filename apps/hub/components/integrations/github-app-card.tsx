"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Github } from "@workspace/ui/icons/social";

import { useTRPC } from "@workspace/trpc/client";

/**
 * GitHub App card: the primary way projects get repo access. Lists the
 * caller's linked installations; Install opens GitHub's repo picker (its
 * post-install redirect lands on /integrations/github/setup, which links the
 * installation to this account). Mirrors IntegrationCard's layout — it just
 * isn't an OAuth integration, so no connect/disconnect.
 */
export const GithubAppCard = () => {
  const trpc = useTRPC();
  const { data: install } = useQuery(trpc.deploy.appInstallUrl.queryOptions());
  const { data: installations } = useQuery(
    trpc.deploy.installations.queryOptions()
  );

  if (!install?.url) return null;

  const linked = installations ?? [];
  const suspended = linked.some((inst) => inst.suspended);

  return (
    <Card className="py-0">
      <CardContent className="flex h-full flex-col gap-4 p-5.5">
        <div className="flex items-center justify-between">
          <div className="bg-muted/60 border-border flex size-11 items-center justify-center rounded-[12px] border">
            <Github className="size-6" />
          </div>
          {linked.length > 0 &&
            (suspended ? (
              <Badge className="gap-1.5 rounded-full border-transparent bg-amber-100 px-3 py-1 text-[12.5px] font-semibold text-amber-700">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Suspended
              </Badge>
            ) : (
              <Badge className="bg-status-success-bg text-status-success gap-1.5 rounded-full border-transparent px-3 py-1 text-[12.5px] font-semibold">
                <span className="bg-status-success size-1.5 rounded-full" />
                Installed
              </Badge>
            ))}
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-[15.5px] font-bold">GitHub App</h4>
          <p className="text-muted-foreground text-[13.5px] leading-relaxed">
            Install our GitHub App on the repositories you want to manage. It
            powers imports, previews and publishing without sharing your
            personal access.
          </p>
          {linked.length > 0 && (
            <div className="space-y-1 pt-2">
              {linked.map((inst) => (
                <div
                  key={inst.installationId}
                  className="text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-2 text-[13px]"
                >
                  <span className="text-foreground flex-1 truncate font-medium">
                    {inst.accountLogin}
                  </span>
                  <span>
                    {inst.suspended
                      ? "Suspended"
                      : inst.repositorySelection === "all"
                        ? "All repositories"
                        : "Selected repositories"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button
          variant={linked.length ? "outline" : "default"}
          size="sm"
          render={
            <a href={install.url} target="_blank" rel="noopener noreferrer">
              {linked.length ? "Manage on GitHub" : "Install"}
            </a>
          }
        />
      </CardContent>
    </Card>
  );
};
