"use client";

import { useEffect } from "react";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";

import { trackVisit } from "@/lib/tracker";

import {
  RepoHeaderProvider,
  useRepoHeaderState,
} from "@/components/repo/repo-header-context";
import { RepoSidebar } from "@/components/repo/repo-sidebar";

function RepoHeader() {
  const { header } = useRepoHeaderState();
  const hasHeaderContent =
    header !== null &&
    header !== undefined &&
    header !== false &&
    header !== "";

  if (!hasHeaderContent) return null;

  return (
    <header className="bg-background sticky top-0 z-30 flex h-14 shrink-0 items-center border-b px-4 md:px-6">
      <SidebarTrigger className="mr-2 md:hidden" />
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
    <SidebarProvider>
      <RepoHeaderProvider>
        <RepoSidebar />
        <SidebarInset className="bg-shell min-h-screen">
          <RepoHeader />
          <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
        </SidebarInset>
      </RepoHeaderProvider>
    </SidebarProvider>
  );
}
