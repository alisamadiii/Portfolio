"use client";

import { useParams } from "next/navigation";

import { DocumentTitle } from "@/components/document-title";
import { NewsletterGate } from "@/components/newsletter/newsletter-gate";
import { TemplatePage } from "@/components/newsletter/template-editor";

export default function NewsletterTemplatePage() {
  const { templateId } = useParams<{ templateId: string }>();
  return (
    <>
      <DocumentTitle title="Template" />
      <NewsletterGate>
        <TemplatePage templateId={templateId} />
      </NewsletterGate>
    </>
  );
}
