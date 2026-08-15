"use client";

import { useConfig } from "@/contexts/config-context";

import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { Canvas } from "@/components/canvas/canvas";

export default function Page() {
  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  return (
    <>
      <DocumentTitle
        title={formatRepoBranchTitle(
          "Canvas",
          config.owner,
          config.repo,
          config.branch
        )}
      />
      {/* Full-bleed: escape RepoLayout's main padding; own scroll surface. */}
      <div className="-m-4 h-[calc(100vh)] overflow-hidden md:-m-8">
        <Canvas />
      </div>
    </>
  );
}
