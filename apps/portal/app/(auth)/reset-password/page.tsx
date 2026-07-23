"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { useSendResetEmail } from "@workspace/auth/hooks/use-functions";

import { AuthHeader } from "@/components/auth/auth-header";

import { ResetPassword } from "./reset";

const formSchema = z.object({
  email: z.string().email(),
});

export default function PasswordReset() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}

function Content() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const sendResetEmail = useSendResetEmail();

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    sendResetEmail.mutate(
      {
        email: values.email,
        redirectTo: `${window.location.origin}/reset-password`,
      },
      {
        onError: (error) => {
          form.setError("root", { message: error.message });
        },
      }
    );
  };

  if (token) {
    return <ResetPassword token={token} />;
  }

  return (
    <div className="flex flex-col">
      <AuthHeader
        title="Reset your password"
        description="We'll email you a link to set a new password"
      />

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mt-8 flex w-full flex-col gap-3"
      >
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field aria-invalid={fieldState.invalid}>
              <FieldLabel className="sr-only">Email</FieldLabel>
              <FieldContent>
                <Input
                  {...field}
                  type="email"
                  placeholder="Email"
                  aria-invalid={fieldState.invalid}
                  size="lg"
                  className="bg-background h-12 rounded-full px-5 text-base"
                />
              </FieldContent>
              <FieldError
                errors={fieldState.error ? [fieldState.error] : undefined}
              />
            </Field>
          )}
        />

        <FieldError errors={[form.formState.errors.root]} />

        <Button
          type="submit"
          isLoading={sendResetEmail.isPending}
          className="mt-1 h-12 w-full rounded-full"
          size="lg"
        >
          {sendResetEmail.isSuccess
            ? "Please check your email"
            : "Send Reset Email"}
        </Button>
      </form>

      <a
        href="/login"
        className="text-muted-foreground hover:text-foreground mt-6 w-fit text-sm transition-colors"
      >
        Back to login
      </a>
    </div>
  );
}
