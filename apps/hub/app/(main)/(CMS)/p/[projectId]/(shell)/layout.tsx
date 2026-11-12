"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { AppShell } from "@/components/ds/layout/app-shell";
import { ProjectSidebar } from "@/components/ds/layout/project-sidebar";
import { siteName, TopBar } from "@/components/ds/layout/top-bar";
import { useEntitlement } from "@/hooks/use-plans";
import { useInstalledApps } from "@/hooks/use-installed-apps";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";
import { repoPath } from "@/lib/paths";

/** Shell for every project page except the editor: top bar + project sidebar. */
export default function ProjectShellLayout({ children }: { children: React.ReactNode }) {
  const projectId = useRouteProjectId();
  const project = useProject();
  const { entitlement } = useEntitlement(projectId || undefined);
  // The plan cache can be present on the client's first render but never on
  // the server, so the label waits for mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { installed } = useInstalledApps(projectId);
  const pathname = usePathname() ?? "";
  const wide = pathname.includes("/business-info/");

  const name = siteName(project?.websiteUrl) ?? project?.repo ?? "Site";
  return (
    <AppShell
      wide={wide}
      topBar={
        <TopBar
          project={{ projectId, name, plan: mounted ? entitlement?.label : undefined }}
          editorHref={repoPath(projectId, "website")}
        />
      }
      sidebar={
        <ProjectSidebar
          base={repoPath(projectId)}
          installed={installed}
          showSettings={project?.role == null || project.role === "full-access"}
        />
      }
    >
      {children}
    </AppShell>
  );
}
