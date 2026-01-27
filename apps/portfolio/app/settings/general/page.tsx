"use client";

import { Spinner } from "@workspace/ui/components/spinner";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { GeneralAvatar } from "@/components/settings/general/avatar";
import { EmailName } from "@/components/settings/general/email-name";

export default function GeneralPage() {
  const user = useCurrentUser();

  if (user.isPending) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmailName />
      <GeneralAvatar />
    </div>
  );
}
