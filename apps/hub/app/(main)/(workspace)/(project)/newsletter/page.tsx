"use client";

import { DocumentTitle } from "@/components/document-title";
import { NewsletterGate } from "@/components/newsletter/newsletter-gate";
import { NewsletterPage } from "@/components/newsletter/newsletter-page";

export default function ProjectNewsletterPage() {
  return (
    <>
      <DocumentTitle title="Newsletter" />
      <NewsletterGate>
        <NewsletterPage />
      </NewsletterGate>
    </>
  );
}
