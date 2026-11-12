"use client";

import { AgencyBillingPage } from "@/components/agency/settings/billing-page";
import { DocumentTitle } from "@/components/document-title";

export default function BillingPage() {
  return (
    <>
      <DocumentTitle title="Billing" />
      <AgencyBillingPage />
    </>
  );
}
