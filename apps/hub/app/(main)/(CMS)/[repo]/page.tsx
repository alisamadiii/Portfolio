"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { repoPath } from "@/lib/paths";

import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { Canvas } from "@/components/canvas/canvas";

export default function Page() {
  const { config } = useConfig();
  const { user } = useUser();
  const router = useRouter();
  const [error, setError] = useState(false);

  // Canvas is the repo root when the site exposes a live preview URL.
  const hasBaseUrl = Boolean((config?.object as any)?.settings?.baseUrl);

  useEffect(() => {
    if (hasBaseUrl) return;
    if (config?.object.content?.[0]) {
      router.replace(
        repoPath(
          config.repo,
          config.object.content[0].type,
          config.object.content[0].name
        )
      );
    } else if (config?.object.media) {
      router.replace(
        repoPath(config.repo, "media", config.object.media[0].name)
      );
    } else if (isAdminUser(user) && isConfigEnabled(config?.object)) {
      router.replace(repoPath(config!.repo, "configuration"));
    } else {
      setError(true);
    }
  }, [config, router, user, hasBaseUrl]);

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

  return error ? (
    isAdminUser(user) ? (
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Configuration unavailable</EmptyTitle>
          <EmptyDescription>
            This repository is not configured, and configuration access is
            disabled here. Edit &quot;.pages.yml&quot; on GitHub if you think
            this is a mistake.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="default"
            render={
              <Link
                href={`https://github.com/${config?.owner}/${config?.repo}/edit/${encodeURIComponent(config!.branch)}/.pages.yml`}
              >
                Edit configuration on GitHub
              </Link>
            }
          />
        </EmptyContent>
      </Empty>
    ) : (
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Repository not configured</EmptyTitle>
          <EmptyDescription>
            This repository does not have a &quot;.pages.yml&quot; file yet. Ask
            a GitHub admin to initialize the configuration first.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  ) : null;
}
