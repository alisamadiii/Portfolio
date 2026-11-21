"use client";

import { DocumentTitle } from "@/components/document-title";
import { SiteMonitorPage } from "@/components/site-monitor/site-monitor-page";

export default function SiteMonitorProblemsRoute() {
  return (
    <>
      <DocumentTitle title="Problems · Site Monitor" />
      <SiteMonitorPage tab="problems" />
    </>
  );
}
