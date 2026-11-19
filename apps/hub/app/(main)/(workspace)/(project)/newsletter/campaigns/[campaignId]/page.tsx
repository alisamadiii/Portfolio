"use client";

import { useParams } from "next/navigation";

import { DocumentTitle } from "@/components/document-title";
import { CampaignPage } from "@/components/newsletter/campaign-editor";
import { NewsletterGate } from "@/components/newsletter/newsletter-gate";

export default function NewsletterCampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  return (
    <>
      <DocumentTitle title="Campaign" />
      <NewsletterGate>
        <CampaignPage campaignId={campaignId} />
      </NewsletterGate>
    </>
  );
}
