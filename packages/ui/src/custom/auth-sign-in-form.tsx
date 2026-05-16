"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  useSignin,
  useSignInWithProvider,
} from "@workspace/auth/hooks/use-functions";

import { Button } from "../components/button";
import { Field, FieldContent, FieldError, FieldLabel } from "../components/field";
import { Input } from "../components/input";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

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
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => handleSocialLogin("google")}
          isLoading={onSignInWithGoogle.isPending}
        >
          Google
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => handleSocialLogin("github")}
          isLoading={onSignInWithGitHub.isPending}
        >
          GitHub
        </Button>
      </div>

      <div className="relative my-2 flex items-center">
        <div className="flex-1 border-t" />
        <span className="text-muted-foreground px-3 text-xs">or</span>
        <div className="flex-1 border-t" />
      </div>

      <form
        onSubmit={form.handleSubmit(handleLogin)}
        className="flex flex-col gap-3"
      >
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field aria-invalid={fieldState.invalid}>
              <FieldLabel>Email</FieldLabel>
              <FieldContent>
                <Input
                  {...field}
                  type="email"
                  placeholder="example@email.com"
                  aria-invalid={fieldState.invalid}
                  size="lg"
                />
              </FieldContent>
              <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field aria-invalid={fieldState.invalid}>
              <FieldLabel>Password</FieldLabel>
              <FieldContent>
                <Input
                  {...field}
                  type="password"
                  placeholder="********"
                  aria-invalid={fieldState.invalid}
                  size="lg"
                />
              </FieldContent>
              <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
            </Field>
          )}
        />

        <FieldError errors={form.formState.errors.root ? [form.formState.errors.root] : undefined} />

        <div className="flex justify-end">
          <a
            href={forgotPasswordHref}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Forgot Password?
          </a>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={signin.isPending}
        >
          Sign In
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSignUp}
          className="text-foreground underline"
        >
          Sign up
        </button>
      </p>
    </div>
  );
}
