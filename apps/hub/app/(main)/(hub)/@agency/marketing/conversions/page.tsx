"use client";

import { ConversionsPage } from "@/components/agency/conversions/conversions-page";
import { DocumentTitle } from "@/components/document-title";

export default function MarketingConversionsPage() {
  return (
    <div className="space-y-6">
      <DocumentTitle title="Conversions" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">Conversions</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl text-[14.5px]">
          What Google Ads counts as a result of your ads. Primary actions are what your
          campaigns optimize for; secondary ones are only reported.
        </p>
      </div>
      <ConversionsPage />
    </div>
  );
}
