"use client";

import { useConfig } from "@/contexts/config-context";

import { EditorShell } from "@/components/shell/editor-shell";
import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";

export default function Page() {
  const { config } = useConfig();

  // The shell renders even without a root _site.json — a missing manifest just
  // surfaces an in-editor warning badge (see EditorShell) instead of blocking
  // the whole page, so the user can still see the project and its settings.
  return (
    <>
      <DocumentTitle
        title={formatRepoBranchTitle(
          "Canvas",
          config?.owner ?? "",
          config?.repo ?? "",
          config?.branch ?? ""
        )}
      />
      {/* Full-bleed: escape RepoLayout's main padding; own scroll surface. */}
      <div className="-m-4 h-[calc(100vh)] overflow-hidden md:-m-8">
        <EditorShell />
      </div>
    </>
  );
}
