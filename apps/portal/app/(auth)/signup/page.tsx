"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SignUpForm } from "@workspace/ui/custom/auth-sign-up-form";
import { urls } from "@workspace/ui/lib/company";

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

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Welcome</h1>
      <p className="text-muted-foreground">Create an account to get started</p>

      <div className="mt-8 w-full max-w-sm">
        <SignUpForm
          onSuccess={() => {
            router.push(
              `/verify-email${redirectUrl ? `?redirectUrl=${redirectUrl}` : ""}`
            );
          }}
          onSignIn={() => {
            router.push(
              `/login${redirectUrl ? `?redirectUrl=${redirectUrl}` : ""}`
            );
          }}
          socialRedirectUrl={redirectUrl || urls.portal}
        />
      </div>
    </div>
  );
}
