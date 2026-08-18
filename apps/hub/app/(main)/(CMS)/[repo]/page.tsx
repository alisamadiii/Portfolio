"use client";

import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { useQuery } from "@tanstack/react-query";
import { isConfigEnabled } from "@workspace/cms-core/config";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { useTRPC } from "@workspace/trpc/client";

import { isAdminUser } from "@/lib/authz-shared";

import { EditorShell } from "@/components/shell/editor-shell";
import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";

export default function Page() {
  const { config } = useConfig();
  const { user } = useUser();
  const trpc = useTRPC();

  // Canvas is the repo root when the site exposes a live preview URL —
  // either via the legacy .pages.yml `settings.baseUrl` or a v2 cms.json
  // manifest (which always carries a baseUrl).
  const legacyBaseUrl = Boolean((config?.object as any)?.settings?.baseUrl);
  const manifestQuery = useQuery(
    trpc.cms.manifest.get.queryOptions(
      {
        owner: config?.owner ?? "",
        repo: config?.repo ?? "",
        branch: config?.branch ?? "",
      },
      {
        enabled:
          !legacyBaseUrl &&
          Boolean(config?.owner && config?.repo && config?.branch),
        staleTime: 60_000,
      }
    )
  );
  const hasBaseUrl = legacyBaseUrl || Boolean(manifestQuery.data);

  if (!legacyBaseUrl && manifestQuery.isLoading) {
    return (
      <div className="bg-shell relative -m-4 h-[calc(100vh)] overflow-hidden md:-m-8" />
    );
  }

  if (hasBaseUrl) {
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

  // No baseUrl: same fullscreen chrome, hint card instead of a canvas.
  const canConfigure = isAdminUser(user) && isConfigEnabled(config?.object);

  return (
    <div className="bg-shell relative -m-4 h-[calc(100vh)] overflow-hidden md:-m-8">
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>No site preview yet</EmptyTitle>
          <EmptyDescription>
            Add &quot;settings.baseUrl&quot; to &quot;.pages.yml&quot; with your
            site&apos;s live URL to see its pages on the canvas.
          </EmptyDescription>
        </EmptyHeader>
        {canConfigure && (
          <EmptyContent>
            <Button
              variant="default"
              render={
                <Link href={`/${config!.repo}/configuration`}>
                  Open configuration
                </Link>
              }
            />
          </EmptyContent>
        )}
      </Empty>
    </div>
  );
}
