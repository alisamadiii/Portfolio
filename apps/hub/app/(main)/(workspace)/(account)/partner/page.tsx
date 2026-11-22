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
        description="Refer local businesses that need a website and earn 20% of their first website payment, after payment processing fees."
      />
      <PartnerPage />
    </>
  );
}
