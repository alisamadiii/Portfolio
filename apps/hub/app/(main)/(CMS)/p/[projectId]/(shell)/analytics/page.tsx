"use client";

import { AnalyticsPage } from "@/components/analytics/analytics-page";
import { DocumentTitle } from "@/components/document-title";
import { ProjectFeatureGate } from "@/components/settings/project-paywall";

export default function ProjectAnalyticsPage() {
  return (
    <>
      <DocumentTitle title="Analytics" />
      <ProjectFeatureGate feature="analytics">
        <AnalyticsPage />
      </ProjectFeatureGate>
    </>
  );
}
