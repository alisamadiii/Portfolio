"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldError } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { useResetPassword } from "@workspace/auth/hooks/use-functions";

const formSchema = z.object({
  password: z.string().min(8),
});

interface ResetPasswordProps {
  token: string;
}

export function ResetPassword({ token }: ResetPasswordProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
    },
  });

  const resetPassword = useResetPassword();

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    resetPassword.mutate(
      {
        newPassword: values.password,
        token,
      },
      {
        onError: (error) => {
          form.setError("root", { message: error.message });
        },
      }
    );
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Password Reset</h1>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mt-8 flex w-full max-w-sm flex-col gap-4"
      >
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Input
                {...field}
                type="password"
                placeholder="********"
                aria-invalid={fieldState.invalid}
                label="Password"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <FieldError errors={[form.formState.errors.root]} />
      </form>
      <Button
        onClick={form.handleSubmit(handleSubmit)}
        isLoading={resetPassword.isPending}
        className="mt-8 w-full max-w-sm"
        size="lg"
      >
        {resetPassword.isSuccess
          ? "Password Reset Successfully"
          : "Reset Password"}
      </Button>
    </div>
  );
}
