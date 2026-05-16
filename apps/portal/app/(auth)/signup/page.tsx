"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SignUpForm } from "@workspace/ui/custom/auth-sign-up-form";
import { urls } from "@workspace/ui/lib/company";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { VerifyEmailDialog } from "@/components/auth/verify-email-dialog";
import { useNugsVerifyEmail } from "@/hooks/use-nugs";

export default function SignUpPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}

function Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl");
  const { isOpen, setIsOpen, setEmail } = useNugsVerifyEmail();
  const { data: user } = useCurrentUser();

  const destination = redirectUrl || urls.portal;

  useEffect(() => {
    if (user?.user?.emailVerified && !isOpen) {
      router.replace(destination);
    }
  }, [user, isOpen, router, destination]);

  return (
    <div className="flex flex-col gap-2">
      <VerifyEmailDialog email="" />
      <h1 className="text-3xl font-bold">Welcome</h1>
      <p className="text-muted-foreground">Create an account to get started</p>

      <div className="mt-8">
        <SignUpForm
          onSuccess={(email) => {
            setIsOpen(true);
            setEmail(email);
          }}
          onSignIn={() => {
            router.push(
              `/login${redirectUrl ? `?redirectUrl=${redirectUrl}` : ""}`
            );
          }}
          socialRedirectUrl={destination}
        />
      </div>
    </div>
  );
}
