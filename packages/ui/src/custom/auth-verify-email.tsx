"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";

import { Button } from "../components/button";
import { InputOTP, InputOTPSlot } from "../components/input-otp";
import { Spinner } from "../components/spinner";
import { cn } from "../lib/utils";

import { authClient } from "@workspace/auth/auth-client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

type VerifyEmailProps = {
  onSuccess: () => void;
  email?: string;
};

export function VerifyEmail({ onSuccess, email: emailProp }: VerifyEmailProps) {
  const { data: currentUser } = useCurrentUser();
  const email = emailProp || currentUser?.user?.email || "";

  const verifyEmail = useMutation({
    mutationFn: async (otp: string) => {
      const { data, error } = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      });

      if (error) {
        throw new Error(error.message || error.statusText);
      }

      return data;
    },
    onSuccess: () => onSuccess(),
  });

  const resendOtp = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      if (error) {
        throw new Error(error.message || error.statusText);
      }

      return data;
    },
  });

  if (currentUser?.user?.emailVerified) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <motion.svg
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 18 18"
          className="text-blue-500"
        >
          <title>badge-check</title>
          <g fill="currentColor">
            <path d="M17,9c0-1.097-.568-2.114-1.465-2.707,.215-1.054-.103-2.175-.878-2.95s-1.897-1.093-2.95-.878c-.594-.897-1.61-1.465-2.707-1.465s-2.114,.568-2.707,1.465c-1.057-.218-2.175,.103-2.95,.878-.776,.776-1.093,1.896-.878,2.95-.897,.593-1.465,1.609-1.465,2.707s.568,2.113,1.465,2.707c-.215,1.054,.102,2.174,.878,2.95,.775,.776,1.895,1.092,2.95,.878,.593,.897,1.609,1.465,2.707,1.465s2.113-.568,2.707-1.465c1.051,.215,2.174-.103,2.95-.878s1.093-1.896,.878-2.95c.897-.593,1.465-1.61,1.465-2.707Zm-4.157-2.292l-4.25,5.5c-.136,.176-.343,.283-.565,.291-.01,0-.019,0-.028,0-.212,0-.415-.09-.558-.248l-2.25-2.5c-.277-.308-.252-.782,.056-1.06,.309-.276,.782-.252,1.06,.056l1.648,1.832,3.701-4.789c.253-.328,.725-.388,1.052-.135,.328,.253,.388,.724,.135,1.052Z" />
          </g>
        </motion.svg>
        <p className="text-lg font-medium">Email verified</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-muted-foreground text-center text-sm">
        We sent a verification code to{" "}
        <span className="text-foreground font-medium">
          {email}
        </span>
      </p>

      <div className="relative flex flex-col items-center gap-4">
        <InputOTP
          maxLength={6}
          onComplete={verifyEmail.mutate}
          disabled={verifyEmail.isPending}
          onChange={() => verifyEmail.reset()}
        >
          <InputOTPSlot
            index={0}
            data-error={verifyEmail.isError}
            data-success={verifyEmail.isSuccess}
          />
          <InputOTPSlot
            index={1}
            data-error={verifyEmail.isError}
            data-success={verifyEmail.isSuccess}
          />
          <InputOTPSlot
            index={2}
            data-error={verifyEmail.isError}
            data-success={verifyEmail.isSuccess}
          />
          <InputOTPSlot
            index={3}
            data-error={verifyEmail.isError}
            data-success={verifyEmail.isSuccess}
          />
          <InputOTPSlot
            index={4}
            data-error={verifyEmail.isError}
            data-success={verifyEmail.isSuccess}
          />
          <InputOTPSlot
            index={5}
            data-error={verifyEmail.isError}
            data-success={verifyEmail.isSuccess}
          />
        </InputOTP>

        <Spinner
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+0.5rem)] animate-spin opacity-0 duration-300",
            (verifyEmail.isPending || verifyEmail.isSuccess) && "opacity-100"
          )}
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => resendOtp.mutate()}
        disabled={resendOtp.isPending || verifyEmail.isPending}
      >
        {resendOtp.isPending ? "Sending..." : "Resend verification email"}
      </Button>
    </div>
  );
}
