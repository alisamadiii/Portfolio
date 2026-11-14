"use client";

import { DocumentTitle } from "@/components/document-title";
import { WebsitesPage } from "@/components/client-websites/websites-page";

export default function ClientWebsitesPage() {
  return (
    <>
      <DocumentTitle title="Client websites" />
      <WebsitesPage />
    </>
  );
}
