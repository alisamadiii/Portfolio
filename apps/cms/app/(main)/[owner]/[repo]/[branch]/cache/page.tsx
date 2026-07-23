"use client";

import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { isAdminUser } from "@/lib/authz-shared";
import { isCacheEnabled } from "@/lib/config";

import { CachePage } from "@/components/cache/cache-page";
import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";

export default function Page() {
  const { config } = useConfig();
  const { user } = useUser();

  if (!config) throw new Error("Configuration not found.");

  if (!isAdminUser(user)) {
    return (
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Access denied</EmptyTitle>
          <EmptyDescription>
            Only GitHub users can manage the cache.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!isCacheEnabled(config.object)) {
    return (
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Cache disabled</EmptyTitle>
          <EmptyDescription>
            Enable the cache in &quot;.pages.yml&quot; by setting
            &quot;settings.cache: true&quot;.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <DocumentTitle
        title={formatRepoBranchTitle(
          "Cache",
          config.owner,
          config.repo,
          config.branch
        )}
      />
      <CachePage
        owner={config.owner}
        repo={config.repo}
        branch={config.branch}
      />
    </>
  );
}
