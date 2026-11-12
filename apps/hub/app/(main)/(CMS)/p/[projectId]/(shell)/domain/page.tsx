"use client";

import { AgencyDomainPage } from "@/components/agency/settings/domain-page";
import { DocumentTitle } from "@/components/document-title";

export default function DomainPage() {
  return (
    <>
      <DocumentTitle title="Domain" />
      <AgencyDomainPage />
    </>
  );
}
