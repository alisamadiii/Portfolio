"use client";

import { Spinner } from "@workspace/ui/components/spinner";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { Accounts } from "@/components/settings/accounts";
import { DangerSettings } from "@/components/settings/danger";
import { GeneralAvatar } from "@/components/settings/general/avatar";
import { Company } from "@/components/settings/general/company";
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
        <Company />
        <GeneralAvatar />
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold capitalize">Accounts</h2>
        <Accounts />
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold capitalize">Danger</h2>
        <DangerSettings />
      </div>
    </div>
  );
}
