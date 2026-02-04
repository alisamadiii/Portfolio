"use client";

import { Spinner } from "@workspace/ui/components/spinner";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { BillingInvoices } from "@/components/settings/billing/invoices";
import { BillingPortal } from "@/components/settings/billing/portal";
import { DangerSettings } from "@/components/settings/danger";
import { GeneralAvatar } from "@/components/settings/general/avatar";
import { EmailName } from "@/components/settings/general/email-name";

export default function SettingsPage() {
  const user = useCurrentUser();

  if (user.isPending) {
    return (
      <div className="flex h-48 min-h-[80dvh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold capitalize">General</h2>
        <EmailName />
        <GeneralAvatar />
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold capitalize">Billing</h2>
        <BillingPortal />
        {/* <BillingSubscriptions /> */}
        <BillingInvoices />
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold capitalize">Danger</h2>
        <DangerSettings />
      </div>
    </div>
  );
}
