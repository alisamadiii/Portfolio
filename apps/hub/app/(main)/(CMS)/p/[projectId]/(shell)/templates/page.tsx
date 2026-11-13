"use client";

import { AgencyBoundary } from "@/components/agency/agency-boundary";
import { DocumentTitle } from "@/components/document-title";
import { PageHeader } from "@/components/ds/layout/page-header";
import { TemplatesPage } from "@/components/templates/templates-page";

export default function ProjectTemplatesPage() {
  return (
    <>
      <DocumentTitle title="Templates" />
      <AgencyBoundary
        title="Templates aren't set up for your site yet"
        header={
          <PageHeader
            title="Templates"
            description="Reusable text for appointments and messages."
          />
        }
      >
        <TemplatesPage />
      </AgencyBoundary>
    </>
  );
}
