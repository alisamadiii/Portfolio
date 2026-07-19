"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

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
      <div className="space-y-10">
        <div className="space-y-5">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <SectionHeading
          title="General"
          description="Your personal and company details."
        />
        <EmailName />
        <Company />
        <GeneralAvatar />
      </section>

      <section className="space-y-5">
        <SectionHeading
          title="Accounts"
          description="Sign-in methods linked to your account."
        />
        <Accounts />
      </section>

      <section className="space-y-5">
        <SectionHeading
          title="Danger"
          description="Irreversible account actions."
          destructive
        />
        <DangerSettings />
      </section>
    </div>
  );
}

const SectionHeading = ({
  title,
  description,
  destructive,
}: {
  title: string;
  description: string;
  destructive?: boolean;
}) => (
  <div className="space-y-1.5">
    <h2
      className={cn(
        "text-[27px] font-extrabold tracking-tight",
        destructive && "text-destructive"
      )}
    >
      {title}
    </h2>
    <p className="text-muted-foreground text-[14.5px]">{description}</p>
  </div>
);
