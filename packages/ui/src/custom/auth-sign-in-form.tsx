"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  useSignin,
  useSignInWithProvider,
} from "@workspace/auth/hooks/use-functions";

import { Button } from "../components/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "../components/field";
import { Input } from "../components/input";
import { GitHubIcon, GoogleIcon } from "./provider-icons";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const inputClassName = "bg-background h-12 rounded-full px-5 text-base";

type SignInFormProps = {
  onSuccess: () => void;
  onSignUp: () => void;
  forgotPasswordHref: string;
  socialRedirectUrl: string;
};

export function SignInForm({
  onSuccess,
  onSignUp,
  forgotPasswordHref,
  socialRedirectUrl,
}: SignInFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signin = useSignin();
  const onSignInWithGoogle = useSignInWithProvider("google");
  const onSignInWithGitHub = useSignInWithProvider("github");

  const handleLogin = (values: z.infer<typeof loginSchema>) => {
    signin.mutate(values, {
      onSuccess: () => onSuccess(),
      onError: (error) => {
        form.setError("root", { message: error.message });
      },
    });
  };

  const handleSocialLogin = (provider: "google" | "github") => {
    const mutation =
      provider === "google" ? onSignInWithGoogle : onSignInWithGitHub;
    mutation.mutate(
      { redirectUrl: socialRedirectUrl },
      {
        onError: (error) => {
          form.setError("root", { message: error.message });
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={form.handleSubmit(handleLogin)}
        className="flex flex-col gap-3"
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
                  className={inputClassName}
                />
              </FieldContent>
              <FieldError
                errors={fieldState.error ? [fieldState.error] : undefined}
              />
            </Field>
          )}
        />

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
                  placeholder="Password"
                  aria-invalid={fieldState.invalid}
                  size="lg"
                  className={`${inputClassName} pr-12`}
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
              <FieldError
                errors={fieldState.error ? [fieldState.error] : undefined}
              />
            </Field>
          )}
        />

        <FieldError
          errors={
            form.formState.errors.root
              ? [form.formState.errors.root]
              : undefined
          }
        />

        <Button
          type="submit"
          size="lg"
          className="mt-1 h-12 w-full rounded-full"
          isLoading={signin.isPending}
        >
          Log in
        </Button>
      </form>

      <div className="flex items-center">
        <div className="flex-1 border-t" />
        <span className="text-muted-foreground px-3 text-xs">
          Or authorize with
        </span>
        <div className="flex-1 border-t" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-full"
          onClick={() => handleSocialLogin("google")}
          isLoading={onSignInWithGoogle.isPending}
        >
          <GoogleIcon className="size-4" />
          Google
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-full"
          onClick={() => handleSocialLogin("github")}
          isLoading={onSignInWithGitHub.isPending}
        >
          <GitHubIcon className="size-4" />
          GitHub
        </Button>
      </div>

      <div className="mt-2 flex flex-col gap-2 text-sm">
        <a
          href={forgotPasswordHref}
          className="text-foreground w-fit font-medium transition-opacity hover:opacity-70"
        >
          Forgot password?
        </a>
        <p className="text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSignUp}
            className="text-foreground font-medium"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
