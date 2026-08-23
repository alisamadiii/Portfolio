"use client";

import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { BookText } from "@/components/icon";

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


import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { Entry } from "@/components/entry/entry";
import { BasePath } from "@/components/settings/base-path";

export default function Page() {
  const { config, setConfig } = useConfig();
  const { myRole } = useRepo();

  // No sha means `.pages.yml` couldn't be loaded (missing or wrong base path).
  // Surface the base path here so the user can fix it without leaving the page.
  const isConfigMissing = !config?.sha;

  const handleSave = async (data: Record<string, any>) => {
    setConfig(data.config);
  };

  if (myRole !== "full-access") {
    return (
      <Empty className="absolute inset-0 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Access denied</EmptyTitle>
          <EmptyDescription>
            Full access is required to manage repository configuration.
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
      <div className="bg-background shadow-xs flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border p-5 md:p-6">
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <Entry
            path=".pages.yml"
            onSave={handleSave}
            title="Configuration"
            headerMeta={
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      render={
                        <Link
                          href="https://pagescms.org/docs/configuration/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <BookText />
                          <span className="sr-only">Configuration docs</span>
                        </Link>
                      }
                    />
                  }
                />
                <TooltipContent>View docs</TooltipContent>
              </Tooltip>
            }
          />
        </div>
      </div>
    </div>
  );
}
