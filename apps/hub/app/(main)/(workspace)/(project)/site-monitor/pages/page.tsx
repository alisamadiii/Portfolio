"use client";

import { DocumentTitle } from "@/components/document-title";
import { SiteMonitorPage } from "@/components/site-monitor/site-monitor-page";

export default function SiteMonitorPagesRoute() {
  return (
    <>
      <DocumentTitle title="Pages · Site Monitor" />
      <SiteMonitorPage tab="pages" />
    </>
  );
}
