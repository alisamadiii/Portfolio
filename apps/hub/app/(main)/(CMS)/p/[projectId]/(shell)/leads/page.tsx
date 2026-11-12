"use client";

import { AgencyBoundary } from "@/components/agency/agency-boundary";
import { DocumentTitle } from "@/components/document-title";
import { PageHeader } from "@/components/ds/layout/page-header";
import { LeadsPage } from "@/components/leads/leads-page";

export default function ProjectLeadsPage() {
  return (
    <>
      <DocumentTitle title="Leads" />
      <AgencyBoundary
        title="Leads isn't set up for your site yet"
        header={
          <PageHeader
            title="Leads"
            description="Where your leads come from and who to follow up with."
          />
        }
      >
        <LeadsPage />
      </AgencyBoundary>
    </>
  );
}
