"use client";

import { useMemo } from "react";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";


import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { useRepoHeader } from "@/components/repo/repo-header-context";
import { BasePath } from "@/components/settings/base-path";

export default function Page() {
  const { config } = useConfig();
  const { myRole } = useRepo();

  const header = useMemo(
    () => <span className="font-semibold">Settings</span>,
    []
  );
  useRepoHeader({ header });

  if (myRole !== "full-access") {
    return (
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Access denied</EmptyTitle>
          <EmptyDescription>
            Full access is required to manage repository settings.
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
