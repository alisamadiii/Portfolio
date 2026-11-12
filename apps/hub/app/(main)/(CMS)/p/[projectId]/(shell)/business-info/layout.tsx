"use client";

import { AgencyBoundary } from "@/components/agency/agency-boundary";
import { DocumentTitle } from "@/components/document-title";
import { PageHeader } from "@/components/ds/layout/page-header";

export default function BusinessInfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DocumentTitle title="Business info" />
      <AgencyBoundary
        title="Business info isn't set up for your site yet"
        header={
          <PageHeader
            title="Business info"
            description="Seven short sections about your business, used for your website copy, your Google Ads and your emails."
          />
        }
      >
        {children}
      </AgencyBoundary>
    </>
  );
}
