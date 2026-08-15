"use client";

import { useMemo } from "react";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { isAdminUser } from "@/lib/authz-shared";

import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { useRepoHeader } from "@/components/repo/repo-header-context";
import { BasePath } from "@/components/settings/base-path";

export default function Page() {
  const { config } = useConfig();
  const { user } = useUser();

  const header = useMemo(
    () => <span className="font-semibold">Settings</span>,
    []
  );
  useRepoHeader({ header });

  if (!isAdminUser(user)) {
    return (
      <Empty className="absolute inset-0 rounded-none border-0">
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
    <div className="mx-auto w-full max-w-screen-md">
      {config && (
        <DocumentTitle
          title={formatRepoBranchTitle(
            "Settings",
            config.owner,
            config.repo,
            config.branch
          )}
        />
      )}
      {config?.owner && config?.repo && (
        <BasePath owner={config.owner} repo={config.repo} />
      )}
    </div>
  );
}
