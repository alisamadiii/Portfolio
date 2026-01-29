import { useState } from "react";
import { useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Ellipsis, Lock } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { useTRPC } from "@workspace/trpc/client";

const formSchema = z
  .object({
    password: z.string().min(8, {
      message: "Passwords must be 8 characters or more.",
    }),
    confirmPassword: z.string().min(8, {
      message: "Passwords must be 8 characters or more.",
    }),
    revokeAllSessions: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const Password = () => {
  const { id } = useParams<{ id: string }>();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      revokeAllSessions: false,
    },
  });

  const changePassword = useMutation(
    useTRPC().admin.users.updatePassword.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to change password");
      },
    })
  );

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    changePassword.mutate(
      {
        newPassword: values.password,
        userId: id,
        revokeAllSessions: values.revokeAllSessions ?? false,
      },
      {
        onSuccess: () => {
          setChangePasswordOpen(false);
        },
        onError: ({ message }) => {
          form.setError("confirmPassword", {
            message,
          });
        },
      }
    );
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-2">
        <Lock size={14} />
        ●●●●●●●●●●
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
            Change password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-500">
            Remove password
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent
          className="md:max-w-96"
          onAnimationStart={() => changePasswordOpen && form.reset()}
        >
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex w-full flex-col gap-4"
          >
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Enter new password"
                    aria-invalid={fieldState.invalid}
                    label="Password"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Confirm new password"
                    aria-invalid={fieldState.invalid}
                    label="Confirm password"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="revokeAllSessions"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldLabel>Revoke all sessions</FieldLabel>
                    </div>
                    <FieldError errors={[fieldState.error]} />
                  </FieldContent>
                </Field>
              )}
            />

            <FieldError errors={[form.formState.errors.root]} />
          </form>
          {/* <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field, formState }) => (
                    <FormItem>
                      <LabelInput
                        label="Password"
                        placeholder="Enter new password"
                        error={formState.errors.password?.message}
                        type="password"
                        autoComplete="off"
                        {...field}
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field, formState }) => (
                    <FormItem>
                      <LabelInput
                        label="Confirm password"
                        placeholder="Confirm new password"
                        type="password"
                        error={formState.errors.confirmPassword?.message}
                        autoComplete="off"
                        {...field}
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="revokeAllSessions"
                  render={({ field, formState }) => (
                    <FormItem>
                      <FormLabel htmlFor={field.name}>
                        <Checkbox
                          id={field.name}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        Revoke all sessions
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </form>
            </Form> */}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={changePassword.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              isLoading={changePassword.isPending}
            >
              Change password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
