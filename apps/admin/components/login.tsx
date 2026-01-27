"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  useSignin,
  useSignInWithProvider,
} from "@workspace/auth/hooks/use-functions";

const formSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export function Login() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signin = useSignin();
  const onSignInWithProvider = useSignInWithProvider("google");

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    signin.mutate(values, {
      onSuccess: () => {
        router.refresh();
      },
      onError: (error) => {
        form.setError("root", { message: error.message });
      },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Admin Login</h1>
      <p className="text-muted-foreground">Login to your admin account</p>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mt-8 flex w-full max-w-sm flex-col gap-4"
      >
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
      </form>
      <div className="mb-2 flex w-full max-w-sm justify-end">
        <Link href="/reset-password" className="">
          Forgot Password?
        </Link>
      </div>
      <Button
        onClick={form.handleSubmit(handleSubmit)}
        isLoading={signin.isPending}
        className="w-full max-w-sm"
      >
        Login
      </Button>
      <div className="text-muted-foreground my-2 text-center text-sm">Or</div>
      <Button
        variant={"outline"}
        className="w-full max-w-sm"
        onClick={() => onSignInWithProvider.mutate({ redirectUrl: "/" })}
      >
        Login with Google
      </Button>

      <PageLoading
        active={
          onSignInWithProvider.isPending || onSignInWithProvider.isSuccess
        }
        name="Signing in with Google"
      />
    </div>
  );
}
