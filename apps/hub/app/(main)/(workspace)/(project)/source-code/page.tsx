"use client";

import { DocumentTitle } from "@/components/document-title";
import { SourceCodePage } from "@/components/source-code/source-code-page";

export default function ProjectSourceCodePage() {
  return (
    <>
      <DocumentTitle title="Source Code" />
      <SourceCodePage />
    </>
  );
}
