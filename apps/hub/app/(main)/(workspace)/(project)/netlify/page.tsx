"use client";

import { DocumentTitle } from "@/components/document-title";
import { NetlifyPage } from "@/components/netlify/netlify-page";

export default function ProjectNetlifyPage() {
  return (
    <>
      <DocumentTitle title="Netlify" />
      <NetlifyPage />
    </>
  );
}
