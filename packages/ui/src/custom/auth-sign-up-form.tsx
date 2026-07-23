"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Mail, MailCheck } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { authClient } from "@workspace/auth/auth-client";
import {
  useMagicLink,
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

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
});

const magicSchema = z.object({
  email: z.email(),
});

const inputClassName = "bg-background h-12 rounded-full px-5 text-base";

type SignUpFormProps = {
  onSuccess: (email: string) => void;
  onSignIn: () => void;
  socialRedirectUrl: string;
  onMagicSentChange?: (sent: boolean) => void;
};

export function SignUpForm({
  onSuccess,
  onSignIn,
  socialRedirectUrl,
  onMagicSentChange,
}: SignUpFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [magicSent, setMagicSent] = useState(false);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const magicForm = useForm<z.infer<typeof magicSchema>>({
    resolver: zodResolver(magicSchema),
    defaultValues: { email: "" },
  });

  const magicLink = useMagicLink();
  const onSignInWithGoogle = useSignInWithProvider("google");
  const onSignInWithGitHub = useSignInWithProvider("github");

  const handleMagicLink = (values: z.infer<typeof magicSchema>) => {
    magicLink.mutate(
      { email: values.email, callbackURL: socialRedirectUrl },
      {
        onSuccess: () => {
          setMagicSent(true);
          onMagicSentChange?.(true);
        },
        onError: (error) => {
          magicForm.setError("root", { message: error.message });
        },
      }
    );
  };

  const signup = useMutation({
    mutationFn: async (values: z.infer<typeof signupSchema>) => {
      const response = await authClient.signUp.email({
        email: values.email,
        name: values.name,
        password: values.password,
        metadata: {},
        phone: "",
        company: "",
        address: "",
      });

      if (response.error) {
        throw new Error(response.error.message || response.error.statusText);
      }

      const emailOtpResponse = await authClient.emailOtp.sendVerificationOtp({
        email: values.email,
        type: "email-verification",
      });

      if (emailOtpResponse.error) {
        throw new Error(
          emailOtpResponse.error.message || emailOtpResponse.error.statusText
        );
      }

      return response;
    },
  });

  const handleSubmit = (values: z.infer<typeof signupSchema>) => {
    signup.mutate(values, {
      onSuccess: () => onSuccess(values.email),
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

  if (magicSent) {
    const email = magicForm.getValues("email");
    return (
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
          <MailCheck className="size-6" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold tracking-tight">
            Check your email
          </h2>
          <p className="text-muted-foreground text-sm text-balance">
            We sent a sign-in link to{" "}
            <span className="text-foreground font-medium">{email}</span>. Click
            it to finish creating your account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMagicSent(false);
            onMagicSentChange?.(false);
            magicForm.reset();
          }}
          className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  if (mode === "magic") {
    return (
      <div className="flex flex-col gap-4">
        <form
          key="magic"
          onSubmit={magicForm.handleSubmit(handleMagicLink)}
          className="flex flex-col gap-3"
        >
          <Controller
            control={magicForm.control}
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

          <FieldError
            errors={
              magicForm.formState.errors.root
                ? [magicForm.formState.errors.root]
                : undefined
            }
          />

          <Button
            type="submit"
            size="lg"
            className="mt-1 h-12 w-full rounded-full"
            isLoading={magicLink.isPending}
          >
            Continue with magic link
          </Button>
        </form>

        <div className="flex items-center">
          <div className="flex-1 border-t" />
          <span className="text-muted-foreground px-3 text-xs">
            Or authorize with
          </span>
          <div className="flex-1 border-t" />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-12 w-full rounded-full"
            onClick={() => setMode("password")}
          >
            <KeyRound className="size-4" />
            Password
          </Button>
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

        <p className="text-muted-foreground mt-2 text-sm">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSignIn}
            className="text-foreground font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        key="password"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-3"
      >
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field aria-invalid={fieldState.invalid}>
              <FieldLabel className="sr-only">Name</FieldLabel>
              <FieldContent>
                <Input
                  {...field}
                  placeholder="Full name"
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
          isLoading={signup.isPending}
        >
          Create account
        </Button>
      </form>

      <div className="flex items-center">
        <div className="flex-1 border-t" />
        <span className="text-muted-foreground px-3 text-xs">
          Or authorize with
        </span>
        <div className="flex-1 border-t" />
      </div>

      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-full"
          onClick={() => setMode("magic")}
        >
          <Mail className="size-4" />
          Magic link
        </Button>
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

      <p className="text-muted-foreground mt-2 text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSignIn}
          className="text-foreground font-medium"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
