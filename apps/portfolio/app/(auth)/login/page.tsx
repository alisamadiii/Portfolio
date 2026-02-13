"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldError } from "@workspace/ui/components/field";
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

export default function Login() {
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
  const onSignInWithProviderGitHub = useSignInWithProvider("github");

  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl");

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    signin.mutate(values, {
      onSuccess: () => {
        console.log(redirectUrl);
        if (redirectUrl) {
          router.push(redirectUrl);
        } else {
          router.refresh();
          router.push("/");
        }
      },
      onError: (error) => {
        form.setError("root", { message: error.message });
      },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Welcome Back</h1>
      <p className="text-muted-foreground">Login to get started</p>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mt-8 flex w-full max-w-sm flex-col gap-4"
      >
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
      <div className="mb-2 flex w-full max-w-sm justify-end">
        <Link href="/reset-password" className="">
          Forgot Password?
        </Link>
      </div>
      <Button
        onClick={form.handleSubmit(handleSubmit)}
        isLoading={signin.isPending}
        className="w-full max-w-sm"
        size="lg"
      >
        Login
      </Button>
      <div className="text-muted-foreground my-2 text-center text-sm">Or</div>
      <div className="grid w-full max-w-sm grid-cols-2 gap-2">
        <Button
          variant={"outline"}
          className="w-full"
          onClick={() =>
            onSignInWithProvider.mutate(
              {
                redirectUrl: redirectUrl ? redirectUrl : "/",
              },
              {
                onError: (error) => {
                  toast.error(error.message);
                },
              }
            )
          }
          size="lg"
        >
          Google
        </Button>
        <Button
          variant={"outline"}
          className="w-full"
          onClick={() =>
            onSignInWithProviderGitHub.mutate(
              {
                redirectUrl: redirectUrl ? redirectUrl : "/",
              },
              {
                onError: (error) => {
                  toast.error(error.message);
                },
              }
            )
          }
          size="lg"
        >
          GitHub
        </Button>
      </div>

      <p className="mt-3 text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>

      <PageLoading
        active={onSignInWithProvider.isPending}
        name="Signing in with Google"
      />
      <PageLoading
        active={onSignInWithProviderGitHub.isPending}
        name="Signing in with GitHub"
      />
    </div>
  );
}
