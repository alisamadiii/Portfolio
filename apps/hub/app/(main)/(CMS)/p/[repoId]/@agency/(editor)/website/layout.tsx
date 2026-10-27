import { ProjectSnapshotGate } from "@/components/repo/project-snapshot-gate";

export default async function WebsiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;
  return <ProjectSnapshotGate repoId={Number(repoId)}>{children}</ProjectSnapshotGate>;
}
