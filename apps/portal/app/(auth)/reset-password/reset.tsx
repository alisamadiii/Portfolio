"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
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

import { useResetPassword } from "@workspace/auth/hooks/use-functions";

import { AuthHeader } from "@/components/auth/auth-header";

const formSchema = z.object({
  password: z.string().min(8),
});

interface ResetPasswordProps {
  token: string;
}

export function ResetPassword({ token }: ResetPasswordProps) {
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="flex flex-col">
      <AuthHeader
        title="Set a new password"
        description="Choose a password with at least 8 characters"
      />

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mt-8 flex w-full flex-col gap-3"
      >
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field aria-invalid={fieldState.invalid}>
              <FieldLabel className="sr-only">Password</FieldLabel>
              <FieldContent className="relative">
                <Input
                  {...field}
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  aria-invalid={fieldState.invalid}
                  size="lg"
                  className="bg-background h-12 rounded-full px-5 pr-12 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-4 flex items-center transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </FieldContent>
              <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
            </Field>
          )}
        />

        <FieldError errors={[form.formState.errors.root]} />

        <Button
          type="submit"
          isLoading={resetPassword.isPending}
          className="mt-1 h-12 w-full rounded-full"
          size="lg"
        >
          {resetPassword.isSuccess
            ? "Password Reset Successfully"
            : "Reset Password"}
        </Button>
      </form>
    </div>
  );
}
