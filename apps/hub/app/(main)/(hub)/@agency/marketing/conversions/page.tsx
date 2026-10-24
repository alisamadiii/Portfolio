"use client";

import { ConversionsPage } from "@/components/agency/conversions/conversions-page";
import { DocumentTitle } from "@/components/document-title";

export default function MarketingConversionsPage() {
  return (
    <>
      <DocumentTitle title="Conversions" />
      <ConversionsPage />
    </>
  );
}
