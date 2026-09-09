"use client";

import { useConfig } from "@/contexts/config-context";
import { useQuery } from "@tanstack/react-query";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { useTRPC } from "@workspace/trpc/client";

import { EditorShell } from "@/components/shell/editor-shell";
import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";

export default function Page() {
  const { config } = useConfig();
  const trpc = useTRPC();

  // The canvas needs a root _site.json manifest (which always carries a
  // baseUrl). No manifest ⇒ this repo has no _site.json — show a hint instead.
  const manifestQuery = useQuery(
    trpc.cms.manifest.get.queryOptions(
      {
        owner: config?.owner ?? "",
        repo: config?.repo ?? "",
        branch: config?.branch ?? "",
      },
      {
        enabled: Boolean(config?.owner && config?.repo && config?.branch),
        staleTime: 60_000,
      }
    )
  );

  if (manifestQuery.isLoading) {
    return (
      <div className="bg-shell relative -m-4 h-[calc(100vh)] overflow-hidden md:-m-8" />
    );
  }

  if (manifestQuery.data) {
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

  // No manifest: this repo has no root _site.json.
  return (
    <div className="bg-shell relative -m-4 h-[calc(100vh)] overflow-hidden md:-m-8">
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>This project has no _site.json</EmptyTitle>
          <EmptyDescription>
            Add a <code>_site.json</code> file to your repo root — with{" "}
            <code>cms</code>, <code>seo</code>, and <code>variables</code> — so
            the CMS can load this project&apos;s pages and settings.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
