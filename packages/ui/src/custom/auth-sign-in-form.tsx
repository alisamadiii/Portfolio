"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Mail, MailCheck } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  useMagicLink,
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

const magicSchema = z.object({
  email: z.email(),
});

const inputClassName = "bg-background h-12 rounded-full px-5 text-base";

type SignInFormProps = {
  onSuccess: () => void;
  onSignUp: () => void;
  forgotPasswordHref: string;
  socialRedirectUrl: string;
  onMagicSentChange?: (sent: boolean) => void;
};

export function SignInForm({
  onSuccess,
  onSignUp,
  forgotPasswordHref,
  socialRedirectUrl,
  onMagicSentChange,
}: SignInFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [magicSent, setMagicSent] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const magicForm = useForm<z.infer<typeof magicSchema>>({
    resolver: zodResolver(magicSchema),
    defaultValues: { email: "" },
  });

  const signin = useSignin();
  const magicLink = useMagicLink();
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
            it to log in.
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

  return (
    <div className="flex flex-col gap-4">
      {mode === "magic" ? (
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
            Send magic link
          </Button>
        </form>
      ) : (
        <form
          key="password"
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
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
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
      )}

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
          onClick={() => setMode(mode === "magic" ? "password" : "magic")}
        >
          {mode === "magic" ? (
            <KeyRound className="size-4" />
          ) : (
            <Mail className="size-4" />
          )}
          {mode === "magic" ? "Password" : "Magic link"}
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

      <div className="mt-2 flex flex-col gap-2 text-sm">
        {mode === "password" && (
          <a
            href={forgotPasswordHref}
            className="text-foreground w-fit font-medium transition-opacity hover:opacity-70"
          >
            Forgot password?
          </a>
        )}
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
