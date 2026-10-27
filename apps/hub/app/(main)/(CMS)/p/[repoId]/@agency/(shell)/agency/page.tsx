"use client";

import { LeadsInbox } from "@/components/agency/leads-inbox";
import { DocumentTitle } from "@/components/document-title";

export default function AgencyPage() {
  return (
    <>
      <DocumentTitle title="All leads" />
      <LeadsInbox />
    </>
  );
}
