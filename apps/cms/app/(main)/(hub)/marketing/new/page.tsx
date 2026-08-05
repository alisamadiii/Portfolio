"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DocumentTitle } from "@/components/document-title";
import { CampaignComposer } from "@/components/marketing/composer";

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <DocumentTitle title="New campaign" />
      <div>
        <Link
          href="/marketing"
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="size-4" />
          Marketing
        </Link>
        <h2 className="text-[27px] font-extrabold tracking-tight">
          New campaign
        </h2>
        <p className="text-muted-foreground mt-1 text-[14.5px]">
          Write it once, send it to every subscribed contact.
        </p>
      </div>
      <CampaignComposer />
    </div>
  );
}
