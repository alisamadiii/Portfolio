import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";

import { useCreateUser } from "@workspace/auth/hooks/use-admin";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required",
  }),
  email: z.string().email({
    message: "Email address is required",
  }),
  password: z.string().min(8, {
    message: "Passwords must be 8 characters or more.",
  }),
  role: z.enum(["user", "admin"]),
});

export const CreateUser = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { mutate: createUser, isPending } = useCreateUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user" as const,
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    createUser(values, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      },
      onError: (error) => {
        if (error.message.toLowerCase().includes("already exists")) {
          form.setError("email", {
            message: "That email address is taken. Please try another.",
          });
        } else {
          form.setError("password", {
            message: "Something went wrong",
          });
        }
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="ml-auto">Create User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex w-full flex-col gap-4"
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
                    placeholder="John Doe"
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
                    placeholder="name@example.com"
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
                    placeholder="********"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </FieldContent>
              </Field>
            )}
          />

          <Separator />

          <Controller
            control={form.control}
            name="role"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Role</FieldLabel>
                <FieldContent>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </FieldContent>
              </Field>
            )}
          />

          <FieldError errors={[form.formState.errors.root]} />
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={() => form.reset()}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            isLoading={isPending}
          >
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
