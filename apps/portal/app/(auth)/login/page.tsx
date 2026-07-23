"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SignInForm } from "@workspace/ui/custom/auth-sign-in-form";
import { resolveAppName, resolveRedirectUrl } from "@workspace/ui/lib/company";

import { AuthHeader } from "@/components/auth/auth-header";

export default function Login() {
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
  // Never trust the raw param — it can point anywhere and reaches callbackURL
  const redirectUrl = resolveRedirectUrl(rawRedirectUrl);

  const appName = resolveAppName(redirectUrl);
  const hasApp = Boolean(appName) && appName !== "Portal";

  const [magicSent, setMagicSent] = useState(false);

  const handleSuccess = () => {
    // The client router can't route to another origin (admin, motion, …)
    if (redirectUrl.startsWith("/")) {
      router.push(redirectUrl);
    } else {
      window.location.href = redirectUrl;
    }
  };

  return (
    <div className="flex flex-col">
      {!magicSent && (
        <AuthHeader
          title={`Login to ${hasApp ? appName : "your portal"}`}
          description={
            hasApp
              ? `Sign in to continue to ${appName}`
              : "Access your projects, files, and invoices in one place"
          }
        />
      )}

      <div className={magicSent ? "" : "mt-8"}>
        <SignInForm
          onSuccess={handleSuccess}
          onSignUp={() => {
            router.push(
              `/signup${rawRedirectUrl ? `?redirectUrl=${encodeURIComponent(rawRedirectUrl)}` : ""}`
            );
          }}
          forgotPasswordHref="/reset-password"
          socialRedirectUrl={redirectUrl}
          onMagicSentChange={setMagicSent}
        />
      </div>
    </div>
  );
}
