"use client";

import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";

import {
  useResendEmailVerification,
  useVerifyEmail,
} from "@workspace/auth/hooks/use-functions";

import { useNugsVerifyEmail } from "@/hooks/use-nugs";

interface VerifyEmailDialogProps {
  children?: React.ReactElement;
  email: string;
  onSuccess?: () => void;
}

export const VerifyEmailDialog = ({
  children,
  email,
  onSuccess,
}: VerifyEmailDialogProps) => {
  const {
    isOpen,
    setIsOpen,
    email: emailParams,
    setEmail: setEmailParams,
  } = useNugsVerifyEmail();

  const resendEmailVerification = useResendEmailVerification();
  const verifyEmail = useVerifyEmail({ onSuccess });

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        setEmailParams(null);
      }}
    >
      {children && <AlertDialogTrigger render={children} />}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Verify Email</AlertDialogTitle>
          <AlertDialogDescription>
            We&apos;ve sent you an email to verify your email address. <br />
            <span className="text-primary">{email || emailParams}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4 flex justify-center">
          <InputOTP
            maxLength={6}
            onComplete={verifyEmail.mutate}
            disabled={
              verifyEmail.isPending || resendEmailVerification.isPending
            }
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} aria-invalid={verifyEmail.isError} />
              <InputOTPSlot index={1} aria-invalid={verifyEmail.isError} />
              <InputOTPSlot index={2} aria-invalid={verifyEmail.isError} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} aria-invalid={verifyEmail.isError} />
              <InputOTPSlot index={4} aria-invalid={verifyEmail.isError} />
              <InputOTPSlot index={5} aria-invalid={verifyEmail.isError} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            render={
              <Button
                variant="outline"
                disabled={
                  verifyEmail.isPending || resendEmailVerification.isPending
                }
              >
                Cancel
              </Button>
            }
          />
          <Button
            disabled={
              resendEmailVerification.isPending || verifyEmail.isPending
            }
            onClick={() =>
              resendEmailVerification.mutate(undefined, {
                onSuccess: () => {
                  toast.success("Email verification code sent");
                },
                onError: (error) => {
                  toast.error(error.message);
                },
              })
            }
          >
            Resend Code
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
