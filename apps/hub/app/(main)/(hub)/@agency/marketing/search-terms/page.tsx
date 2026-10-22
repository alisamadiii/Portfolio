"use client";

import { SearchTermsPage } from "@/components/agency/search-terms-page";
import { DocumentTitle } from "@/components/document-title";

export default function MarketingSearchTermsPage() {
  return (
    <div className="space-y-6">
      <DocumentTitle title="Search terms" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">
          Search terms
        </h2>
        <p className="text-muted-foreground mt-1 max-w-3xl text-[14.5px]">
          What people searched before clicking your ads. Exclude the searches
          that spend money without bringing leads.
        </p>
      </div>
      <SearchTermsPage />
    </div>
  );
}
