"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldError } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { PageLoading } from "@workspace/ui/custom/page-loading";

import {
  useMagicLink,
  useSignInWithProvider,
  useSignup,
} from "@workspace/auth/hooks/use-functions";

type AuthView = "options" | "magic-link" | "email-password";

const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const magicLinkSchema = z.object({
  email: z.email(),
});

const transition = { duration: 0.2, ease: "easeInOut" as const };

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl");

  const [view, setView] = useState<AuthView>("options");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", name: "" },
  });

  const magicLinkForm = useForm<z.infer<typeof magicLinkSchema>>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "" },
  });

  const signup = useSignup();
  const magicLink = useMagicLink();
  const onSignInWithGoogle = useSignInWithProvider("google");
  const onSignInWithGitHub = useSignInWithProvider("github");

  const handleSubmit = (values: z.infer<typeof signupSchema>) => {
    signup.mutate(values, {
      onError: (error) => {
        signupForm.setError("root", { message: error.message });
      },
    });
  };

  const handleMagicLink = (values: z.infer<typeof magicLinkSchema>) => {
    magicLink.mutate(
      {
        email: values.email,
        callbackURL: redirectUrl || "/",
      },
      {
        onSuccess: () => setMagicLinkSent(true),
        onError: (error) => {
          magicLinkForm.setError("root", { message: error.message });
        },
      }
    );
  };

  const handleSocialLogin = (provider: "google" | "github") => {
    const mutation =
      provider === "google" ? onSignInWithGoogle : onSignInWithGitHub;
    mutation.mutate(
      { redirectUrl: redirectUrl || "/" },
      { onError: (error) => toast.error(error.message) }
    );
  };

  const goBack = () => {
    setView("options");
    setMagicLinkSent(false);
    signupForm.reset();
    magicLinkForm.reset();
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Welcome</h1>
      <p className="text-muted-foreground">Create an account to get started</p>

      <div className="mt-8 w-full max-w-sm">
        <AnimatePresence mode="wait">
          {view === "options" && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={transition}
              className="flex flex-col gap-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleSocialLogin("google")}
                >
                  Google
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleSocialLogin("github")}
                >
                  GitHub
                </Button>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setView("magic-link")}
              >
                Magic Link
              </Button>
              <Button
                size="lg"
                className="w-full"
                onClick={() => setView("email-password")}
              >
                Email & Password
              </Button>
            </motion.div>
          )}

          {view === "magic-link" && (
            <motion.div
              key="magic-link"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={transition}
              className="flex flex-col gap-4"
            >
              <button
                onClick={goBack}
                className="text-muted-foreground hover:text-foreground -mb-2 flex items-center gap-1 text-sm transition-colors"
              >
                ← Back
              </button>

              <AnimatePresence mode="wait">
                {!magicLinkSent ? (
                  <motion.div
                    key="magic-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    className="flex flex-col gap-4"
                  >
                    <form
                      onSubmit={magicLinkForm.handleSubmit(handleMagicLink)}
                      className="flex flex-col gap-4"
                    >
                      <Controller
                        control={magicLinkForm.control}
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
                      <FieldError
                        errors={[magicLinkForm.formState.errors.root]}
                      />
                      <button className="sr-only">submit</button>
                    </form>
                    <Button
                      size="lg"
                      className="w-full"
                      isLoading={magicLink.isPending}
                      onClick={magicLinkForm.handleSubmit(handleMagicLink)}
                    >
                      Send Magic Link
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="magic-sent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={transition}
                    className="flex flex-col items-center gap-3 py-4 text-center"
                  >
                    <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full text-2xl">
                      ✉
                    </div>
                    <p className="text-lg font-medium">Check your email</p>
                    <p className="text-muted-foreground text-sm">
                      We sent a sign-in link to{" "}
                      <span className="text-foreground font-medium">
                        {magicLinkForm.getValues("email")}
                      </span>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {view === "email-password" && (
            <motion.div
              key="email-password"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={transition}
              className="flex flex-col gap-4"
            >
              <button
                onClick={goBack}
                className="text-muted-foreground hover:text-foreground -mb-2 flex items-center gap-1 text-sm transition-colors"
              >
                ← Back
              </button>

              <form
                onSubmit={signupForm.handleSubmit(handleSubmit)}
                className="flex flex-col gap-4"
              >
                <Controller
                  control={signupForm.control}
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
                  control={signupForm.control}
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
                  control={signupForm.control}
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

                <FieldError errors={[signupForm.formState.errors.root]} />
                <button className="sr-only">submit</button>
              </form>

              <Button
                size="lg"
                className="w-full"
                isLoading={signup.isPending}
                onClick={signupForm.handleSubmit(handleSubmit)}
              >
                Create Account
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-6 text-sm">
        Already have an account?{" "}
        <Link
          href={`/login${redirectUrl ? `?redirectUrl=${redirectUrl}` : ""}`}
          className="underline"
        >
          Login
        </Link>
      </p>

      <PageLoading
        active={onSignInWithGoogle.isPending}
        name="Signing up with Google"
      />
      <PageLoading
        active={onSignInWithGitHub.isPending}
        name="Signing up with GitHub"
      />
    </div>
  );
}
