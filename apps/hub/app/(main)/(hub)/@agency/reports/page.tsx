"use client";

import { ReportsPage } from "@/components/agency/reports-page";
import { DocumentTitle } from "@/components/document-title";

export default function AgencyReportsPage() {
  return (
    <div className="space-y-6">
      <DocumentTitle title="Reports" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">Reports</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl text-[14.5px]">
          Your Monday email reports, kept here week by week so you can compare
          how things move.
        </p>
      </div>
      <ReportsPage />
    </div>
  );
}
