"use client";

import { GeneralAvatar } from "apps/portfolio/components/settings/general/avatar";
import { EmailName } from "apps/portfolio/components/settings/general/email-name";

import { Spinner } from "@workspace/ui/components/spinner";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

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
