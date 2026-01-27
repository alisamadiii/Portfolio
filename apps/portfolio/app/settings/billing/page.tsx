"use client";

import { BillingInvoices } from "apps/portfolio/components/settings/billing/invoices";
import { BillingPortal } from "apps/portfolio/components/settings/billing/portal";
import { BillingSubscriptions } from "apps/portfolio/components/settings/billing/subscriptions";

import { Spinner } from "@workspace/ui/components/spinner";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export default function BillingPage() {
  const updateUser = useCurrentUser();

  if (updateUser.isPending) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  console.log("billing page");

  return (
    <div className="space-y-6">
      <BillingPortal />
      <BillingSubscriptions />
      <BillingInvoices />
    </div>
  );
}
