"use client";

import { useProject } from "@/hooks/use-project";

import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { EditorShell } from "@/components/shell/editor-shell";

export default function Page() {
  const project = useProject();
  if (!project) throw new Error("Project not found.");

  return (
    <>
      <DocumentTitle
        title={formatRepoBranchTitle(
          "Canvas",
          project.owner,
          project.repo,
          project.branch
        )}
      />
      {/* Full-bleed: escape RepoLayout's main padding; own scroll surface. */}
      <div className="-m-4 h-[calc(100vh)] overflow-hidden md:-m-8">
        <EditorShell />
      </div>
    </>
  );
}
