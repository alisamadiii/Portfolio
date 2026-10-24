"use client";

import { BudgetPage } from "@/components/agency/budget-page";
import { DocumentTitle } from "@/components/document-title";

export default function MarketingBudgetPage() {
  return (
    <>
      <DocumentTitle title="Budget" />
      <BudgetPage />
    </>
  );
}
