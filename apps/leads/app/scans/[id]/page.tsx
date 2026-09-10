import { LeadsView } from "@/components/leads-view";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LeadsView scanId={Number(id)} />;
}
