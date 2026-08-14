"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SignUpForm } from "@workspace/ui/custom/auth-sign-up-form";
import { resolveAppName, urls } from "@workspace/ui/lib/company";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { resolveAuthTarget } from "@/lib/auth-redirect";

import { useNugsVerifyEmail } from "@/hooks/use-nugs";

import { AuthHeader } from "@/components/auth/auth-header";
import { VerifyEmailDialog } from "@/components/auth/verify-email-dialog";

export function SignUp() {
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
  const rawRedirect = searchParams.get("redirect");
  const { isOpen, setIsOpen, setEmail } = useNugsVerifyEmail();
  const { data: user } = useCurrentUser();

  // Never trust the raw params — they can point anywhere and reach callbackURL
  const destination = resolveAuthTarget(rawRedirectUrl, rawRedirect);

  const appName = resolveAppName(destination);
  const hasApp = Boolean(appName) && appName !== "Client Hub";

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

  // Carry the incoming redirect params over to /sign-in unchanged
  const carriedParams = new URLSearchParams();
  if (rawRedirectUrl) carriedParams.set("redirectUrl", rawRedirectUrl);
  else if (rawRedirect) carriedParams.set("redirect", rawRedirect);
  const carriedQuery = carriedParams.toString();

  return (
    <div className="flex flex-col">
      <VerifyEmailDialog email="" />
      {!magicSent && (
        <AuthHeader
          title="Create your account"
          description={
            hasApp
              ? `Create an account to continue to ${appName}`
              : "Get started with your Client Hub in under a minute"
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
            router.push(`/sign-in${carriedQuery ? `?${carriedQuery}` : ""}`);
          }}
          socialRedirectUrl={
            // Social callbacks resolve on the auth server's origin — make
            // same-app targets absolute so they land back on the hub
            destination.startsWith("/") ? `${urls.cms}${destination}` : destination
          }
          onMagicSentChange={setMagicSent}
        />
      </div>
    </div>
  );
}
