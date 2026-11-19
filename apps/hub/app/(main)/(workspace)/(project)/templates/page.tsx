"use client";

import { DocumentTitle } from "@/components/document-title";
import { PageHeader } from "@/components/ds/layout/page-header";
import { TemplatesPage } from "@/components/templates/templates-page";

// Templates are free on every project and plan (no agency setup).
export default function ProjectTemplatesPage() {
  return (
    <>
      <DocumentTitle title="Templates" />
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Templates"
          description="Reusable text for appointments and messages."
        />
        <TemplatesPage />
      </div>
    </>
  );
}
