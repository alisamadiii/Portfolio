"use client";

import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { BookText } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import { isAdminUser } from "@/lib/authz-shared";

import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { Entry } from "@/components/entry/entry";
import { BasePath } from "@/components/settings/base-path";

export default function Page() {
  const { config, setConfig } = useConfig();
  const { user } = useUser();

  // No sha means `.pages.yml` couldn't be loaded (missing or wrong base path).
  // Surface the base path here so the user can fix it without leaving the page.
  const isConfigMissing = !config?.sha;

  const handleSave = async (data: Record<string, any>) => {
    setConfig(data.config);
  };

  if (!isAdminUser(user)) {
    return (
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Access denied</EmptyTitle>
          <EmptyDescription>
            Only GitHub users can manage repository configuration.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6">
      {config && (
        <DocumentTitle
          title={formatRepoBranchTitle(
            "Configuration",
            config.owner,
            config.repo,
            config.branch
          )}
        />
      )}
      {isConfigMissing && config?.owner && config?.repo && (
        <BasePath owner={config.owner} repo={config.repo} />
      )}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <Entry
          path=".pages.yml"
          onSave={handleSave}
          title="Configuration"
          headerMeta={
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Link
                    href="https://pagescms.org/docs/configuration/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <BookText />
                    <span className="sr-only">Configuration docs</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View docs</TooltipContent>
            </Tooltip>
          }
        />
      </div>
    </div>
  );
}
