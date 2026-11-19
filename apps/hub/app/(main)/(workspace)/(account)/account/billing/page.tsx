"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PurchasesBilling } from "@/components/billing/purchases-billing";
import { StripeBilling } from "@/components/billing/stripe-billing";
import { DocumentTitle } from "@/components/document-title";
import { PageHeader } from "@/components/ds/layout/page-header";
import { SegmentedTabs } from "@/components/ds/ui/tabs";

export default function BillingPage() {
  return (
    <Suspense>
      <BillingTabs />
    </Suspense>
  );
}

const BillingTabs = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "purchases" ? "purchases" : "plan";

  const setTab = (value: string) => {
    router.replace(value === "purchases" ? `${pathname}?tab=purchases` : pathname, {
      scroll: false,
    });
  };

  return (
    <>
      <DocumentTitle title="Billing" />
      <PageHeader
        title="Billing"
        description="Your plans, invoices and one-time purchases."
        actions={
          <SegmentedTabs
            label="Billing section"
            value={tab}
            onChange={setTab}
            items={[
              { id: "plan", label: "Plan" },
              { id: "purchases", label: "Purchases" },
            ]}
          />
        }
      />
      {tab === "plan" ? <StripeBilling /> : <PurchasesBilling />}
    </>
  );
};
