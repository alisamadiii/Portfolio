"use client";

import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";


import { Collaborators } from "@/components/collaborators";
import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";

export default function Page() {
  const { config } = useConfig();
  const { myRole } = useRepo();
  if (!config) throw new Error(`Configuration not found.`);
  if (myRole !== "full-access") {
    return (
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Access denied</EmptyTitle>
          <EmptyDescription>
            Full access is required to manage collaborators.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-screen-sm flex-1 flex-col">
      <DocumentTitle
        title={formatRepoBranchTitle(
          "Collaborators",
          config.owner,
          config.repo,
          config.branch
        )}
      />
      <div className="relative flex flex-1 flex-col">
        <Collaborators
          owner={config.owner}
          repo={config.repo}
          branch={config?.branch}
        />
      </div>
    </div>
  );
}
