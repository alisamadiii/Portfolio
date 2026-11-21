"use client";

import { DocumentTitle } from "@/components/document-title";
import { SiteMonitorPage } from "@/components/site-monitor/site-monitor-page";

export default function SiteMonitorHistoryRoute() {
  return (
    <>
      <DocumentTitle title="History · Site Monitor" />
      <SiteMonitorPage tab="history" />
    </>
  );
}
