import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { FieldError } from "@workspace/ui/components/field";

import { TextField } from "@/components/ui/mui";

import { useResendEmailVerification } from "@workspace/auth/hooks/use-functions";
import { useCurrentUser, useUpdateUser } from "@workspace/auth/hooks/use-user";

import { useNugsVerifyEmail } from "@/hooks/use-nugs";

import { VerifyEmailDialog } from "@/components/auth/verify-email-dialog";

const schema = z.object({
  name: z.string().min(1, {
    message: "Name is required",
  }),
  email: z.string().email({
    message: "Email address is required",
  }),
});

export const EmailName = () => {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();
  const verifyEmail = useResendEmailVerification(user?.user.email);
  const { setIsOpen, setEmail } = useNugsVerifyEmail();

  const form = useForm<z.infer<typeof schema>>({
    // Same cast as entry-form.tsx — the hoisted zod v4 types leak into the
    // resolver signature while the app itself is on zod v3.
    resolver: zodResolver(
      schema as unknown as Parameters<typeof zodResolver>[0]
    ),
    defaultValues: {
      name: user?.user.name || "",
      email: user?.user.email || "",
    },
  });

  const handleSubmit = (values: z.infer<typeof schema>) => {
    updateUser.mutate(
      {
        name: values.name,
      },
      {
        onSuccess: () => {
          form.reset({
            name: values.name,
          });
          toast.success("Name updated successfully");
        },
        onError: (error) => {
          form.setError("root", {
            message: error.message,
          });
        },
      }
    );
  };

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="card-head">
        <CardTitle className="font-bold">Name & Email</CardTitle>
      </CardHeader>
      <CardContent className="card-body">
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4.5"
        >
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                label="Name"
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
                {...field}
              />
            )}
          />

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                label="Email"
                type="email"
                disabled
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
                {...field}
              />
            )}
          />

          <FieldError errors={[form.formState.errors.root]} />
        </form>

        {!user?.user.emailVerified && (
          <>
            <VerifyEmailDialog email={user?.user.email || ""} />
            <Alert variant="destructive" className="mt-6">
              <AlertTitle>Email not verified</AlertTitle>
              <AlertDescription>
                Your email is not verified. Please verify your email.
              </AlertDescription>
              <Button
                variant={"destructive"}
                className="mt-2 w-48"
                disabled={verifyEmail.isPending}
                onClick={() =>
                  verifyEmail.mutate(undefined, {
                    onSuccess: () => {
                      setIsOpen(true);
                      setEmail(user?.user.email || "");
                    },
                    onError: (error) => {
                      toast.error(
                        error.message || "Failed to send email verification"
                      );
                    },
                  })
                }
              >
                Resend verification email
              </Button>
            </Alert>
          </>
        )}
      </CardContent>
      <CardFooter className="card-band">
        <Button
          className="rounded-full px-6"
          onClick={form.handleSubmit(handleSubmit)}
          disabled={updateUser.isPending || !form.formState.isDirty}
        >
          Save
        </Button>
      </CardFooter>
    </Card>
  );
};
