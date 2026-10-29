import { ProjectSnapshotGate } from "@/components/repo/project-snapshot-gate";

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
