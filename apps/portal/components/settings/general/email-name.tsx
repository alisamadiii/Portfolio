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
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { useResendEmailVerification } from "@workspace/auth/hooks/use-functions";
import { useCurrentUser, useUpdateUser } from "@workspace/auth/hooks/use-user";

import { useNugsVerifyEmail } from "@/hooks/use-nugs";

import { VerifyEmailDialog } from "@/components/auth/verify-email-dialog";

const schema = z.object({
  name: z.string().min(1, {
    message: "Name is required",
  }),
  email: z.email({
    message: "Email address is required",
  }),
});

export const EmailName = () => {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();
  const verifyEmail = useResendEmailVerification(user?.user.email);
  const { setIsOpen, setEmail } = useNugsVerifyEmail();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
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
              <Field aria-invalid={fieldState.invalid}>
                <FieldLabel className="text-[13px] font-semibold">
                  Name
                </FieldLabel>
                <FieldContent>
                  <Input {...field} aria-invalid={fieldState.invalid} />
                </FieldContent>
                <FieldError
                  errors={fieldState.error ? [fieldState.error] : undefined}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field aria-invalid={fieldState.invalid}>
                <FieldLabel className="text-[13px] font-semibold">
                  Email
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    type="email"
                    disabled
                    aria-invalid={fieldState.invalid}
                  />
                </FieldContent>
                <FieldError
                  errors={fieldState.error ? [fieldState.error] : undefined}
                />
              </Field>
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
