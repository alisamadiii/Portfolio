"use client";

import { DocumentTitle } from "@/components/document-title";
import { SiteMonitorPage } from "@/components/site-monitor/site-monitor-page";

export default function SiteMonitorDashboardRoute() {
  return (
    <>
      <DocumentTitle title="Site Monitor" />
      <SiteMonitorPage tab="dashboard" />
    </>
  );
}
