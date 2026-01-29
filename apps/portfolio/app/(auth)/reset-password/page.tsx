"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldError } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { useSendResetEmail } from "@workspace/auth/hooks/use-functions";

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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Password Reset</h1>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mt-8 flex w-full max-w-sm flex-col gap-4"
      >
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Input
                {...field}
                type="email"
                placeholder="example@email.com"
                aria-invalid={fieldState.invalid}
                label="Email"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <FieldError errors={[form.formState.errors.root]} />
      </form>
      <Button
        onClick={form.handleSubmit(handleSubmit)}
        isLoading={sendResetEmail.isPending}
        className="mt-8 w-full max-w-sm"
        size="lg"
      >
        {sendResetEmail.isSuccess
          ? "Please check your email"
          : "Send Reset Email"}
      </Button>
    </div>
  );
}
