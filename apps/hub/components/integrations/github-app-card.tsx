"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, GitBranch } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

import { Badge } from "@/components/ds/ui/badge";
import { ButtonAnchor } from "@/components/ds/ui/button";

import { IntegrationRow } from "./integration-row";

/**
 * GitHub App row: the primary way projects get repo access. Lists the
 * caller's linked installations; Install opens GitHub's repo picker (its
 * post-install redirect lands on /integrations/github/setup, which links the
 * installation to this account). Not an OAuth integration: no disconnect.
 */
export const GithubAppCard = () => {
  const trpc = useTRPC();
  const { data: install } = useQuery(trpc.deploy.appInstallUrl.queryOptions());
  const { data: installations } = useQuery(trpc.deploy.installations.queryOptions());

  if (!install?.url) return null;

  const linked = installations ?? [];
  const suspended = linked.some((inst) => inst.suspended);

  return (
    <IntegrationRow
      icon={<GitBranch className="size-5" strokeWidth={1.8} />}
      name="GitHub App"
      badge={
        linked.length > 0 &&
        (suspended ? (
          <Badge tone="warning" dot>
            Suspended
          </Badge>
        ) : (
          <Badge tone="success" dot>
            Installed
          </Badge>
        ))
      }
      description="Powers imports, previews and publishing for your repositories, without sharing your personal access."
      meta={
        linked.length > 0 &&
        linked.map((inst) => (
          <span key={inst.installationId} className="mr-3">
            {inst.accountLogin} ·{" "}
            {inst.suspended
              ? "Suspended"
              : inst.repositorySelection === "all"
                ? "All repositories"
                : "Selected repositories"}
          </span>
        ))
      }
      action={
        <ButtonAnchor
          variant={linked.length ? "outline" : "primary"}
          size="sm"
          href={install.url}
          target="_blank"
          rel="noopener noreferrer"
          trailingIcon={<ArrowUpRight className="size-3.5" />}
        >
          {linked.length ? "Manage on GitHub" : "Install"}
        </ButtonAnchor>
      }
    />
  );
};
