"use client";

import { Suspense } from "react";

import { DocumentTitle } from "@/components/document-title";
import { WebsitesPage } from "@/components/client-websites/websites-page";

export default function ClientWebsitesPage() {
  return (
    <>
      <DocumentTitle title="Client websites" />
      {/* useSearchParams needs a Suspense boundary for the static build */}
      <Suspense>
        <WebsitesPage />
      </Suspense>
    </>
  );
}
