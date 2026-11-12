import { ProjectSnapshotGate } from "@/components/repo/project-snapshot-gate";

// The editor is the only route that needs the GitHub-backed snapshot (and the
// install-app overlay when the GitHub App isn't on the repo).
export default async function WebsiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectSnapshotGate projectId={projectId}>{children}</ProjectSnapshotGate>;
}
