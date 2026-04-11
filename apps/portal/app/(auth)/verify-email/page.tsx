"use client";

import { Suspense } from "react";
import Link from "next/link";
import { motion } from "motion/react";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import { InputOTP, InputOTPSlot } from "@workspace/ui/components/input-otp";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";

import {
  useResendEmailVerification,
  useVerifyEmail,
} from "@workspace/auth/hooks/use-functions";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export default function VerifyEmail() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
const Content = () => {
  const { isPending, data: currentUser } = useCurrentUser();

  const resendEmailVerificationMutation = useResendEmailVerification();
  const verifyEmailMutation = useVerifyEmail();

  if (isPending) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (currentUser?.user?.emailVerified) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2">
        <motion.svg
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          xmlns="http://www.w3.org/2000/svg"
          width="100"
          height="100"
          viewBox="0 0 18 18"
          className="text-blue-500"
        >
          <title>badge-check</title>
          <g fill="currentColor">
            <path d="M17,9c0-1.097-.568-2.114-1.465-2.707,.215-1.054-.103-2.175-.878-2.95s-1.897-1.093-2.95-.878c-.594-.897-1.61-1.465-2.707-1.465s-2.114,.568-2.707,1.465c-1.057-.218-2.175,.103-2.95,.878-.776,.776-1.093,1.896-.878,2.95-.897,.593-1.465,1.609-1.465,2.707s.568,2.113,1.465,2.707c-.215,1.054,.102,2.174,.878,2.95,.775,.776,1.895,1.092,2.95,.878,.593,.897,1.609,1.465,2.707,1.465s2.113-.568,2.707-1.465c1.051,.215,2.174-.103,2.95-.878s1.093-1.896,.878-2.95c.897-.593,1.465-1.61,1.465-2.707Zm-4.157-2.292l-4.25,5.5c-.136,.176-.343,.283-.565,.291-.01,0-.019,0-.028,0-.212,0-.415-.09-.558-.248l-2.25-2.5c-.277-.308-.252-.782,.056-1.06,.309-.276,.782-.252,1.06,.056l1.648,1.832,3.701-4.789c.253-.328,.725-.388,1.052-.135,.328,.253,.388,.724,.135,1.052Z"></path>
          </g>
        </motion.svg>
        <motion.p
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            duration: 0.5,
            bounce: 0.3,
            delay: 0.05,
          }}
          className="text-2xl font-bold"
        >
          Email verified
        </motion.p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Welcome Back</h1>
      <p className="text-muted-foreground">Login to get started</p>
      <div className="relative mx-auto mt-8 mb-4 flex w-fit flex-col items-center justify-center gap-4">
        <InputOTP
          maxLength={6}
          onComplete={verifyEmailMutation.mutate}
          disabled={verifyEmailMutation.isPending}
          onChange={() => verifyEmailMutation.reset()}
        >
          <InputOTPSlot
            index={0}
            data-error={verifyEmailMutation.isError}
            data-success={verifyEmailMutation.isSuccess}
          />
          <InputOTPSlot
            index={1}
            data-error={verifyEmailMutation.isError}
            data-success={verifyEmailMutation.isSuccess}
          />
          <InputOTPSlot
            index={2}
            data-error={verifyEmailMutation.isError}
            data-success={verifyEmailMutation.isSuccess}
          />
          <InputOTPSlot
            index={3}
            data-error={verifyEmailMutation.isError}
            data-success={verifyEmailMutation.isSuccess}
          />
          <InputOTPSlot
            index={4}
            data-error={verifyEmailMutation.isError}
            data-success={verifyEmailMutation.isSuccess}
          />
          <InputOTPSlot
            index={5}
            data-error={verifyEmailMutation.isError}
            data-success={verifyEmailMutation.isSuccess}
          />
        </InputOTP>

        <Spinner
          className={cn(
            "absolute right-0 translate-x-[calc(100%+0.5rem)] animate-spin opacity-0 duration-300",
            (verifyEmailMutation.isPending || verifyEmailMutation.isSuccess) &&
              "opacity-100"
          )}
        />

        <div className="flex flex-col items-center justify-center">
          <Button
            variant="ghost"
            onClick={() => resendEmailVerificationMutation.mutate()}
            disabled={
              resendEmailVerificationMutation.isPending ||
              verifyEmailMutation.isPending
            }
          >
            Resend verification email
          </Button>
        </div>
      </div>
      <div className="w-full">
        <Link
          href="/signup"
          className={buttonVariants({
            variant: "destructive",
            size: "lg",
            className: cn(
              "pointer-events-none w-full translate-y-[calc(100%+2rem)] rounded-full! text-lg! opacity-0 blur-sm duration-300 md:translate-y-full",
              verifyEmailMutation.isError &&
                "pointer-events-auto translate-y-0 opacity-100 blur-none md:translate-y-0"
            ),
          })}
        >
          Change email
        </Link>
      </div>
    </div>
  );
};
