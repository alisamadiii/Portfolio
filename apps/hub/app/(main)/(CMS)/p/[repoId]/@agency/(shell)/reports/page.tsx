"use client";

import { ReportsPage } from "@/components/agency/reports-page";
import { DocumentTitle } from "@/components/document-title";

export default function AgencyReportsPage() {
  return (
    <>
      <DocumentTitle title="Reports" />
      <ReportsPage />
    </>
  );
}
