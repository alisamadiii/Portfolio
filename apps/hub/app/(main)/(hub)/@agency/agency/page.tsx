"use client";

import { InstallSnippet } from "@/components/agency/install-snippet";
import { LeadsInbox } from "@/components/agency/leads-inbox";
import { DocumentTitle } from "@/components/document-title";

export default function AgencyPage() {
  return (
    <div className="space-y-6">
      <DocumentTitle title="All leads" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">All leads</h2>
        <p className="text-muted-foreground mt-1 text-[14.5px]">
          Everyone who reached out: website forms, booked appointments and
          leads you added by hand. Mark the ones that became customers as won.
        </p>
      </div>
      <LeadsInbox />
      <InstallSnippet />
    </div>
  );
}
