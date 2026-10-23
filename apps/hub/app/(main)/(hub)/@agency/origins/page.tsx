"use client";

import { OriginsPage } from "@/components/agency/origins-page";
import { DocumentTitle } from "@/components/document-title";

export default function AgencyOriginsPage() {
  return (
    <div className="space-y-6">
      <DocumentTitle title="Origins" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">Origins</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl text-[14.5px]">
          The domains your lead form and booking widget are allowed to run on,
          so your form key can&apos;t be used from anywhere else.
        </p>
      </div>
      <OriginsPage />
    </div>
  );
}
