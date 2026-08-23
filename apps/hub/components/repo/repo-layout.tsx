"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { ArrowLeft } from "@/components/icon";

import { Button } from "@workspace/ui/components/button";

import { repoPath } from "@/lib/paths";
import { trackVisit } from "@/lib/tracker";

import { CommandPaletteProvider } from "@/components/chrome/command-palette-provider";
import { PublishProvider } from "@/components/publish/publish-context";
import {
  RepoHeaderProvider,
  useRepoHeaderState,
} from "@/components/repo/repo-header-context";

function RepoHeader() {
  const { repo } = useRepo();
  const { header, backHref, backLabel } = useRepoHeaderState();
  const hasHeaderContent =
    header !== null &&
    header !== undefined &&
    header !== false &&
    header !== "";

  if (!hasHeaderContent) return null;

  return (
    <header className="bg-background sticky top-0 z-30 flex h-14 shrink-0 items-center border-b px-4 md:px-6">
      <Button
        variant="ghost"
        size="sm"
        className="mr-2 shrink-0"
        render={
          <Link href={backHref ?? repoPath(repo)}>
            <ArrowLeft className="size-4" />
            {backLabel ?? "Canvas"}
          </Link>
        }
      />
      <div className="min-w-0 flex-1">{header}</div>
    </header>
  );
}

export function RepoLayout({ children }: { children: React.ReactNode }) {
  const { config } = useConfig();
  const { owner, repo } = useRepo();

  useEffect(() => {
    if (config?.owner && config?.repo && config?.branch) {
      trackVisit(owner, repo, config.branch);
    }
  }, [config, owner, repo]);

  return (
    <RepoHeaderProvider>
      <PublishProvider>
        <CommandPaletteProvider>
          <div className="bg-shell flex min-h-screen flex-col">
            <RepoHeader />
            <main className="min-w-0 flex-1 p-4 [overflow-anchor:none] md:p-8">
              {children}
            </main>
          </div>
        </CommandPaletteProvider>
      </PublishProvider>
    </RepoHeaderProvider>
  );
}
