import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import { Button } from "@workspace/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";
import { Field, FieldError } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { urls } from "@workspace/ui/lib/company";

import { useSignin } from "@workspace/auth/hooks/use-functions";

const formSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const LoginDrawer = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signin = useSignin();

  const router = useRouter();

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    signin.mutate(values, {
      onSuccess: () => {
        router.refresh();
        setOpen(false);
      },
      onError: (error) => {
        form.setError("root", { message: error.message });
      },
    });
  };
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger>{children}</DrawerTrigger>
      <DrawerContent
        overlayClassName="z-100"
        className="rounded-t-5xl! shadow-dialog z-100 mx-auto max-w-xl px-8 pb-8"
      >
        <div className="flex flex-col gap-4">
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="mt-8 flex w-full flex-col gap-4"
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
                    label="Email"
                    aria-invalid={fieldState.invalid}
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
                    label="Password"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <FieldError errors={[form.formState.errors.root]} />

            <Button
              onClick={form.handleSubmit(handleSubmit)}
              isLoading={signin.isPending}
              className="w-full"
              size="lg"
            >
              Login
            </Button>
            <Link
              href={
                urls.portfolio + "/signup?redirectUrl=" + window.location.href
              }
              className="text-muted-foreground hover:text-foreground text-center text-sm"
            >
              Signup
            </Link>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
