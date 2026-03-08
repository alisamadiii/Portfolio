import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Field, FieldError } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { useCurrentUser, useUpdateUser } from "@workspace/auth/hooks/use-user";

const schema = z.object({
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
});

export const Company = () => {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: user?.user.phone || "",
      company: user?.user.company || "",
      address: user?.user.address || "",
    },
  });

  const handleSubmit = (values: z.infer<typeof schema>) => {
    updateUser.mutate(
      {
        phone: values.phone,
        company: values.company,
        address: values.address,
      },
      {
        onSuccess: () => {
          form.reset({
            phone: values.phone,
            company: values.company,
            address: values.address,
          });
          toast.success("Company updated successfully");
        },
        onError: (error) => {
          form.setError("root", {
            message: error.message,
          });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex max-w-sm flex-col gap-4"
        >
          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  label="Phone"
                  placeholder="+1 (971) 382-8969"
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="company"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Input
                  {...field}
                  type="email"
                  aria-invalid={fieldState.invalid}
                  label="Company"
                  placeholder="AliSamadiiLLC"
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="address"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  label="Address"
                  placeholder="Oregon, USA"
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <FieldError errors={[form.formState.errors.root]} />
        </form>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          onClick={form.handleSubmit(handleSubmit)}
          disabled={updateUser.isPending || !form.formState.isDirty}
        >
          Save
        </Button>
      </CardFooter>
    </Card>
  );
};
