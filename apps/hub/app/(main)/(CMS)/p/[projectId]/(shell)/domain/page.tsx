import { redirect } from "next/navigation";

// Domain merged into project Settings.
export default async function DomainPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/p/${projectId}/settings`);
}
