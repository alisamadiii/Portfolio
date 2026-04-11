"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { PageLoading } from "@workspace/ui/custom/page-loading";
import { SignInForm } from "@workspace/ui/custom/auth-sign-in-form";
import { urls } from "@workspace/ui/lib/company";

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
  const redirectUrl = searchParams.get("redirectUrl");

  const handleSuccess = () => {
    if (redirectUrl) {
      router.push(redirectUrl);
    } else {
      window.location.href = urls.portal;
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Welcome Back</h1>
      <p className="text-muted-foreground">Login to get started</p>

      <div className="mt-8 w-full max-w-sm">
        <SignInForm
          onSuccess={handleSuccess}
          onSignUp={() => {
            router.push(
              `/signup${redirectUrl ? `?redirectUrl=${redirectUrl}` : ""}`
            );
          }}
          forgotPasswordHref="/reset-password"
          socialRedirectUrl={redirectUrl || urls.portal}
        />
      </div>
    </div>
  );
}
