"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { DocumentTitle } from "@/components/document-title";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Accounts } from "@/components/account/accounts";
import { DangerSettings } from "@/components/account/danger";
import { GeneralAvatar } from "@/components/account/general/avatar";
import { Company } from "@/components/account/general/company";
import { EmailName } from "@/components/account/general/email-name";

const PageHeading = () => (
  <>
    <DocumentTitle title="Account" />
    <PageHeader
      title="Account"
      description="Your personal details, sign-in methods, and account actions."
    />
  </>
);

export default function AccountPage() {
  const user = useCurrentUser();

  if (user.isPending) {
    return (
      <div className="space-y-10">
        <PageHeading />
        <div className="space-y-5">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeading />

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
  <div className="space-y-1">
    <h3
      className={cn(
        "text-base font-semibold",
        destructive && "text-destructive"
      )}
    >
      {title}
    </h3>
    <p className="text-[13px] text-dim">{description}</p>
  </div>
);
