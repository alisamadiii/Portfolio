"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { VerifyEmail } from "@workspace/ui/custom/auth-verify-email";
import { urls } from "@workspace/ui/lib/company";

export default function VerifyEmailPage() {
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
      <h1 className="text-3xl font-bold">Verify your email</h1>
      <p className="text-muted-foreground">
        Enter the code we sent to your email
      </p>

      <div className="mt-8">
        <VerifyEmail
          onSuccess={() => {
            setTimeout(() => {
              if (redirectUrl) {
                router.push(redirectUrl);
              } else {
                window.location.href = urls.portal;
              }
            }, 2000);
          }}
        />
      </div>
    </div>
  );
}
