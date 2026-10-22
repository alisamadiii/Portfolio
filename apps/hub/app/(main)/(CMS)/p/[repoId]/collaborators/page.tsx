"use client";

import { useProject } from "@/hooks/use-project";
import { useRepo } from "@/hooks/use-repo";

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
  const project = useProject();
  const { myRole } = useRepo();
  if (!project) throw new Error("Project not found.");
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
          project.owner,
          project.repo,
          project.branch
        )}
      />
      <div className="relative flex flex-1 flex-col">
        <Collaborators
          owner={project.owner}
          repo={project.repo}
          repoId={project.repoId ?? 0}
          branch={project?.branch}
        />
      </div>
    </div>
  );
}
