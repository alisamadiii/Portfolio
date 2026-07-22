"use client";

import { useMemo } from "react";
import { DocumentTitle, formatRepoBranchTitle } from "@/components/document-title";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { hasGithubIdentity } from "@/lib/authz-shared";
import { useRepoHeader } from "@/components/repo/repo-header-context";
import { BasePath } from "@/components/settings/base-path";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function Page() {
  const { config } = useConfig();
  const { user } = useUser();

  const header = useMemo(
    () => <span className="font-semibold">Settings</span>,
    [],
  );
  useRepoHeader({ header });

  if (!hasGithubIdentity(user)) {
    return (
      <Empty className="absolute inset-0 border-0 rounded-none">
        <EmptyHeader>
          <EmptyTitle>Access denied</EmptyTitle>
          <EmptyDescription>
            Only GitHub users can manage repository settings.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="max-w-screen-md mx-auto w-full">
      {config && (
        <DocumentTitle
          title={formatRepoBranchTitle(
            "Settings",
            config.owner,
            config.repo,
            config.branch,
          )}
        />
      )}
      {config?.owner && config?.repo && (
        <BasePath owner={config.owner} repo={config.repo} />
      )}
    </div>
  );
}
