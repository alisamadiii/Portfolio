"use client";

import Link from "next/link";
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
              <FieldLabel>Name</FieldLabel>
              <FieldContent>
                <Input
                  {...field}
                  placeholder="Name"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </FieldContent>
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Email</FieldLabel>
              <FieldContent>
                <Input
                  {...field}
                  type="email"
                  placeholder="Email"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </FieldContent>
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Password</FieldLabel>
              <FieldContent>
                <Input
                  {...field}
                  type="password"
                  placeholder="Password"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </FieldContent>
            </Field>
          )}
        />

        <FieldError errors={[form.formState.errors.root]} />

        <button className="sr-only">submit</button>
      </form>
      <Button
        onClick={form.handleSubmit(handleSubmit)}
        isLoading={signup.isPending}
        className="w-full max-w-sm"
      >
        Create Account
      </Button>
      <div className="text-muted-foreground my-2 text-center text-sm">Or</div>
      <Button
        variant={"outline"}
        className="w-full max-w-sm"
        onClick={() => onSignInWithProvider.mutate({ redirectUrl: "/" })}
      >
        Login with Google
      </Button>

      <p className="mt-3 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Login
        </Link>
      </p>

      <PageLoading
        active={
          onSignInWithProvider.isPending || onSignInWithProvider.isSuccess
        }
        name="Signing up with Google"
      />
    </div>
  );
}
