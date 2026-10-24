"use client";

import { AnalyticsPanel } from "@/components/settings/analytics-panel";
import { PageShell } from "@/components/agency/page-shell";
import { DocumentTitle } from "@/components/document-title";

export default function AgencyAnalyticsPage() {
  return (
    <>
      <DocumentTitle title="Analytics" />
      <PageShell
        eyebrow="AGENCY"
        title="Analytics"
        lead="Traffic from your website's Google Analytics property — visitors, sessions, and your most-viewed pages."
      >
        <AnalyticsPanel hideHeading />
      </PageShell>
    </>
  );
}
