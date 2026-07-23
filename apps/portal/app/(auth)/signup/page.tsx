"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SignUpForm } from "@workspace/ui/custom/auth-sign-up-form";
import { resolveRedirectUrl } from "@workspace/ui/lib/company";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { useNugsVerifyEmail } from "@/hooks/use-nugs";

import { AuthHeader } from "@/components/auth/auth-header";
import { VerifyEmailDialog } from "@/components/auth/verify-email-dialog";

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
  const rawRedirectUrl = searchParams.get("redirectUrl");
  const { isOpen, setIsOpen, setEmail } = useNugsVerifyEmail();
  const { data: user } = useCurrentUser();

  const destination = resolveRedirectUrl(rawRedirectUrl);

  useEffect(() => {
    if (user?.user?.emailVerified && !isOpen) {
      // The client router can't route to another origin (admin, motion, …)
      if (destination.startsWith("/")) {
        router.replace(destination);
      } else {
        window.location.href = destination;
      }
    }
  }, [user, isOpen, router, destination]);

  return (
    <div className="flex flex-col">
      <VerifyEmailDialog email="" />
      <AuthHeader
        title="Create your account"
        description="Get started with your client portal in under a minute"
      />

      <div className="mt-8">
        <SignUpForm
          onSuccess={(email) => {
            setIsOpen(true);
            setEmail(email);
          }}
          onSignIn={() => {
            router.push(
              `/login${rawRedirectUrl ? `?redirectUrl=${encodeURIComponent(rawRedirectUrl)}` : ""}`
            );
          }}
          socialRedirectUrl={destination}
        />
      </div>
    </div>
  );
}
