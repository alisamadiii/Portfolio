"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

import { AppShell } from "@/components/ds/layout/app-shell";
import { siteName, TopBar } from "@/components/ds/layout/top-bar";
import { WorkspaceSidebar } from "@/components/ds/layout/workspace-sidebar";
import { useEntitlement } from "@/hooks/use-plans";
import { useInstalledApps } from "@/hooks/use-installed-apps";
import { useProject } from "@/hooks/use-project";
import { useProjectId } from "@/hooks/use-repo";
import { hasDeliveryApp } from "@/components/orders/providers";

/** Top bar with the project switcher + the one sidebar, around every page except the editor. */
export function WorkspaceShell({
  children,
  wide,
  bleed,
}: {
  children: React.ReactNode;
  wide?: boolean;
  bleed?: boolean;
}) {
  const projectId = useProjectId();
  const project = useProject();
  const { entitlement } = useEntitlement(projectId || undefined);
  // The plan cache can be present on the client's first render but never on
  // the server, so the label waits for mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { installed, netlify } = useInstalledApps(projectId);
  const trpc = useTRPC();
  const sourceCode = useQuery(
    trpc.project.sourceCode.queryOptions({ projectId }, { enabled: Boolean(projectId && project?.ownerOrAdmin), staleTime: 60_000 })
  );

  const name = project?.name?.trim() || siteName(project?.websiteUrl) || project?.repo || "Site";
  return (
    <AppShell
      wide={wide}
      bleed={bleed}
      topBar={
        <TopBar
          project={projectId ? { projectId, name, plan: mounted ? entitlement?.label : undefined } : undefined}
          editorHref={projectId ? "/website" : undefined}
        />
      }
      sidebar={
        <WorkspaceSidebar
          hasProject={Boolean(projectId)}
          installed={installed}
          netlify={netlify}
          orders={hasDeliveryApp(installed)}
          showSettings={project?.role == null || project.role === "full-access"}
          showProjectSettings={project?.ownerOrAdmin ?? false}
          showSourceCode={sourceCode.data?.available ?? false}
        />
      }
    >
      {children}
    </AppShell>
  );
}
