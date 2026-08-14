"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SignInForm } from "@workspace/ui/custom/auth-sign-in-form";
import { resolveAppName, urls } from "@workspace/ui/lib/company";

import { resolveAuthTarget } from "@/lib/auth-redirect";

import { AuthHeader } from "@/components/auth/auth-header";

export function SignIn() {
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
  // Never trust the raw params — they can point anywhere and reach callbackURL
  const redirectUrl = resolveAuthTarget(rawRedirectUrl, rawRedirect);

  const appName = resolveAppName(redirectUrl);
  const hasApp = Boolean(appName) && appName !== "Client Hub";

  const [magicSent, setMagicSent] = useState(false);

  const handleSuccess = () => {
    // The client router can't route to another origin (admin, motion, …)
    if (redirectUrl.startsWith("/")) {
      router.push(redirectUrl);
    } else {
      window.location.href = redirectUrl;
    }
  };

  // Carry the incoming redirect params over to /sign-up unchanged
  const carriedParams = new URLSearchParams();
  if (rawRedirectUrl) carriedParams.set("redirectUrl", rawRedirectUrl);
  else if (rawRedirect) carriedParams.set("redirect", rawRedirect);
  const carriedQuery = carriedParams.toString();

  return (
    <div className="flex flex-col">
      {!magicSent && (
        <AuthHeader
          title={`Login to ${hasApp ? appName : "Client Hub"}`}
          description={
            hasApp
              ? `Sign in to continue to ${appName}`
              : "Manage your website, content, billing and requests in one place"
          }
        />
      )}

      <div className={magicSent ? "" : "mt-8"}>
        <SignInForm
          onSuccess={handleSuccess}
          onSignUp={() => {
            router.push(`/sign-up${carriedQuery ? `?${carriedQuery}` : ""}`);
          }}
          forgotPasswordHref="/reset-password"
          socialRedirectUrl={
            // Social callbacks resolve on the auth server's origin — make
            // same-app targets absolute so they land back on the hub
            redirectUrl.startsWith("/") ? `${urls.cms}${redirectUrl}` : redirectUrl
          }
          onMagicSentChange={setMagicSent}
        />
      </div>
    </div>
  );
}
