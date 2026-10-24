import { CampaignDetail } from "@/components/agency/campaigns-page";

export default async function AgencyCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <CampaignDetail campaignId={campaignId} />;
}
