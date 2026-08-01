"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SignUpForm } from "@workspace/ui/custom/auth-sign-up-form";
import { resolveAppName, resolveRedirectUrl } from "@workspace/ui/lib/company";

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

  const appName = resolveAppName(destination);
  const hasApp = Boolean(appName) && appName !== "Portal";

  const [magicSent, setMagicSent] = useState(false);

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
      {!magicSent && (
        <AuthHeader
          title="Create your account"
          description={
            hasApp
              ? `Create an account to continue to ${appName}`
              : "Get started with your client portal in under a minute"
          }
        />
      )}

      <div className={magicSent ? "" : "mt-8"}>
        <SignUpForm
          defaultEmail={searchParams.get("email") ?? undefined}
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
          onMagicSentChange={setMagicSent}
        />
      </div>
    </div>
  );
}
