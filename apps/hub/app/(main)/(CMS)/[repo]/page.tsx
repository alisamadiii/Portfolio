"use client";

import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { isAdminUser } from "@/lib/authz-shared";
import { isConfigEnabled } from "@workspace/cms-core/config";

import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { Canvas } from "@/components/canvas/canvas";
import { CanvasChrome } from "@/components/chrome/canvas-chrome";

export default function Page() {
  const { config } = useConfig();
  const { user } = useUser();

  // Canvas is the repo root when the site exposes a live preview URL.
  const hasBaseUrl = Boolean((config?.object as any)?.settings?.baseUrl);

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
          <Canvas />
        </div>
      </>
    );
  }

  // No baseUrl: same fullscreen chrome, hint card instead of a canvas.
  const canConfigure = isAdminUser(user) && isConfigEnabled(config?.object);

  return (
    <div className="bg-shell relative -m-4 h-[calc(100vh)] overflow-hidden md:-m-8">
      <CanvasChrome />
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
