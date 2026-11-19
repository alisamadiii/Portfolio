"use client";

import { AgencyBoundary } from "@/components/agency/agency-boundary";
import { DocumentTitle } from "@/components/document-title";
import { PageHeader } from "@/components/ds/layout/page-header";
import { GoogleAdsPage } from "@/components/google-ads/google-ads-page";

export default function ProjectGoogleAdsPage() {
  return (
    <>
      <DocumentTitle title="Google Ads" />
      <AgencyBoundary
        feature="ads"
        title="Google Ads isn't set up for your site yet"
        header={
          <PageHeader
            title="Google Ads"
            description="What your ads cost, what they bring in, and where the budget goes."
          />
        }
      >
        <GoogleAdsPage />
      </AgencyBoundary>
    </>
  );
}
