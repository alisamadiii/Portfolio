"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

import { DocumentTitle } from "@/components/document-title";
import { CampaignComposer } from "@/components/marketing/composer";

export default function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const trpc = useTRPC();
  const router = useRouter();

  const { data: campaign, error } = useQuery(
    trpc.marketing.campaigns.get.queryOptions({ id })
  );

  // Only drafts are editable — anything already sending lives on the
  // progress page.
  if (campaign && campaign.status !== "draft") {
    router.replace(`/marketing/${id}`);
    return null;
  }

  return (
    <div className="space-y-6">
      <DocumentTitle title={campaign ? campaign.name : "Edit campaign"} />
      <div>
        <Link
          href="/marketing"
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="size-4" />
          Marketing
        </Link>
        <h2 className="text-[27px] font-extrabold tracking-tight">
          Edit campaign
        </h2>
      </div>

      {error ? (
        <div className="border-destructive/40 bg-destructive/5 rounded-lg border py-14 text-center">
          <p className="text-muted-foreground text-[14.5px]">{error.message}</p>
        </div>
      ) : campaign ? (
        <CampaignComposer
          campaignId={id}
          initial={{
            name: campaign.name,
            subject: campaign.subject,
            editor: campaign.editor,
            html: campaign.html ?? "",
          }}
        />
      ) : null}
    </div>
  );
}
