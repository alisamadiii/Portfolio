"use client";

import { DocumentTitle } from "@/components/document-title";

// Business info is free on every plan and every project: no boundary.
export default function BusinessInfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DocumentTitle title="Business info" />
      {children}
    </>
  );
}
