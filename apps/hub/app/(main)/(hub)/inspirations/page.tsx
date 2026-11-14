"use client";

import { Suspense } from "react";

import { DocumentTitle } from "@/components/document-title";
import { InspirationsPage } from "@/components/inspirations/inspirations-page";

export default function InspirationsRoute() {
  return (
    <>
      <DocumentTitle title="Inspirations" />
      {/* useSearchParams needs a Suspense boundary for the static build */}
      <Suspense>
        <InspirationsPage />
      </Suspense>
    </>
  );
}
