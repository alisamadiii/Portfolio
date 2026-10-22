"use client";

import { BudgetPage } from "@/components/agency/budget-page";
import { DocumentTitle } from "@/components/document-title";

export default function MarketingBudgetPage() {
  return (
    <div className="space-y-6">
      <DocumentTitle title="Budget" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">Budget</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl text-[14.5px]">
          Whether this month&apos;s spend is on track, and each campaign&apos;s
          daily budget.
        </p>
      </div>
      <BudgetPage />
    </div>
  );
}
