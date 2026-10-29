"use client";

import { SearchTermsPage } from "@/components/agency/search-terms-page";
import { DocumentTitle } from "@/components/document-title";

export default function MarketingSearchTermsPage() {
  return (
    <>
      <DocumentTitle title="Search terms" />
      <SearchTermsPage />
    </>
  );
}
