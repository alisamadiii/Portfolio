"use client";

import { DocumentTitle } from "@/components/document-title";
import { PageHeader } from "@/components/ds/layout/page-header";
import { PartnerPage } from "@/components/partner/partner-page";

export default function PartnerProgramPage() {
  return (
    <>
      <DocumentTitle title="Partner Program" />
      <PageHeader
        title="Partner Program"
        description="Refer local businesses that need a website and earn 40% of their first payment."
      />
      <PartnerPage />
    </>
  );
}
