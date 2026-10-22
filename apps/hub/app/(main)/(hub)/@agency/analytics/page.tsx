"use client";

import { AnalyticsPanel } from "@/components/settings/analytics-panel";
import { DocumentTitle } from "@/components/document-title";

// The panel brings its own heading, description and range controls.
export default function AgencyAnalyticsPage() {
  return (
    <div>
      <DocumentTitle title="Analytics" />
      <div className="-mx-6">
        <AnalyticsPanel />
      </div>
    </div>
  );
}
