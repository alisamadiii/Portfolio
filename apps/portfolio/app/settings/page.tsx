"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";

import { useLogout } from "@workspace/auth/hooks/use-functions";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { Accounts } from "@/components/settings/accounts";
import { BillingInvoices } from "@/components/settings/billing/invoices";
import { BillingPortal } from "@/components/settings/billing/portal";
import { DangerSettings } from "@/components/settings/danger";
import { GeneralAvatar } from "@/components/settings/general/avatar";
import { Company } from "@/components/settings/general/company";
import { EmailName } from "@/components/settings/general/email-name";

export default function SettingsPage() {
  const user = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();

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
        <Company />
        <GeneralAvatar />
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold capitalize">Accounts</h2>
        <Accounts />
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold capitalize">Billing</h2>
        {/* <BillingPortal /> */}
        {/* <BillingSubscriptions /> */}
        <BillingInvoices />
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold capitalize">Danger</h2>
        <DangerSettings />
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold capitalize">Support</h2>
        <RequestDialog>
          <Button size="lg" variant="outline">
            Contact Support
          </Button>
        </RequestDialog>
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold capitalize">Logout</h2>
        <Button
          onClick={() => {
            logout.mutate(undefined, {
              onSuccess: () => {
                toast.success("Logged out successfully");
                router.push("/login");
              },
              onError: (error) => {
                toast.error(error.message);
              },
            });
          }}
          size="lg"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
