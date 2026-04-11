"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../components/button";
import { Field, FieldError } from "../components/field";
import { Input } from "../components/input";

import { authClient } from "@workspace/auth/auth-client";
import { useSignInWithProvider } from "@workspace/auth/hooks/use-functions";

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
});

type SignUpFormProps = {
  onSuccess: (email: string) => void;
  onSignIn: () => void;
  socialRedirectUrl: string;
};

export function SignUpForm({
  onSuccess,
  onSignIn,
  socialRedirectUrl,
}: SignUpFormProps) {
  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSignInWithGoogle = useSignInWithProvider("google");
  const onSignInWithGitHub = useSignInWithProvider("github");

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
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-3"
      >
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Input
                {...field}
                placeholder="John Doe"
                aria-invalid={fieldState.invalid}
                label="Name"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

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

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={signup.isPending}
        >
          Create Account
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSignIn}
          className="text-foreground underline"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
