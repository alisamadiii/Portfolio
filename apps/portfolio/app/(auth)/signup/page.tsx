"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldError } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { PageLoading } from "@workspace/ui/custom/page-loading";

import {
  useSignInWithProvider,
  useSignup,
} from "@workspace/auth/hooks/use-functions";

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export default function SignUpPage() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const signup = useSignup();
  const onSignInWithProvider = useSignInWithProvider("google");
  const onSignInWithProviderGitHub = useSignInWithProvider("github");

  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl");

  const handleSubmit = (values: z.infer<typeof schema>) => {
    signup.mutate(values, {
      onError: (error) => {
        form.setError("root", { message: error.message });
      },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Welcome</h1>
      <p className="text-muted-foreground">Create an account to get started</p>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mt-8 flex w-full max-w-sm flex-col gap-4"
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

        <button className="sr-only">submit</button>
      </form>
      <Button
        onClick={form.handleSubmit(handleSubmit)}
        isLoading={signup.isPending}
        className="mt-8 w-full max-w-sm"
        size="lg"
      >
        Create Account
      </Button>
      <div className="text-muted-foreground my-2 text-center text-sm">Or</div>
      <div className="grid w-full max-w-sm grid-cols-2 gap-2">
        <Button
          variant={"outline"}
          className="w-full"
          onClick={() =>
            onSignInWithProvider.mutate({
              redirectUrl: redirectUrl ? redirectUrl : "/",
            })
          }
          size="lg"
        >
          Google
        </Button>
        <Button
          variant={"outline"}
          className="w-full"
          onClick={() =>
            onSignInWithProviderGitHub.mutate({
              redirectUrl: redirectUrl ? redirectUrl : "/",
            })
          }
          size="lg"
        >
          GitHub
        </Button>
      </div>

      <p className="mt-3 text-sm">
        Already have an account?{" "}
        <Link
          href={`/login${redirectUrl ? `?redirectUrl=${redirectUrl}` : ""}`}
          className="underline"
        >
          Login
        </Link>
      </p>

      <PageLoading
        active={onSignInWithProvider.isPending}
        name="Signing up with Google"
      />
      <PageLoading
        active={onSignInWithProviderGitHub.isPending}
        name="Signing up with GitHub"
      />
    </div>
  );
}
