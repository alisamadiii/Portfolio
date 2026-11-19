import { redirect } from "next/navigation";

import { ProjectSnapshotGate } from "@/components/repo/project-snapshot-gate";
import { getWorkspaceProject } from "@/lib/session-server";

// The editor is the only route that needs the GitHub-backed snapshot (and the
// install-app overlay when the GitHub App isn't on the repo).
export default async function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const project = await getWorkspaceProject();
  if (!project) redirect("/");
  return <ProjectSnapshotGate projectId={project.projectId}>{children}</ProjectSnapshotGate>;
}
