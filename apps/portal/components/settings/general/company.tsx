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
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field";
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
    <Card className="gap-0 py-0">
      <CardHeader className="card-head">
        <CardTitle className="font-bold">Company</CardTitle>
      </CardHeader>
      <CardContent className="card-body">
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4.5"
        >
          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <Field aria-invalid={fieldState.invalid}>
                <FieldLabel className="text-[13px] font-semibold">
                  Phone
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    placeholder="+1 (971) 382-8969"
                  />
                </FieldContent>
                <FieldError
                  errors={fieldState.error ? [fieldState.error] : undefined}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="company"
            render={({ field, fieldState }) => (
              <Field aria-invalid={fieldState.invalid}>
                <FieldLabel className="text-[13px] font-semibold">
                  Company
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    placeholder="AliSamadiiLLC"
                  />
                </FieldContent>
                <FieldError
                  errors={fieldState.error ? [fieldState.error] : undefined}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="address"
            render={({ field, fieldState }) => (
              <Field aria-invalid={fieldState.invalid}>
                <FieldLabel className="text-[13px] font-semibold">
                  Address
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    placeholder="Oregon, USA"
                  />
                </FieldContent>
                <FieldError
                  errors={fieldState.error ? [fieldState.error] : undefined}
                />
              </Field>
            )}
          />

          <FieldError errors={[form.formState.errors.root]} />
        </form>
      </CardContent>
      <CardFooter className="card-band">
        <Button
          className="rounded-full px-6"
          onClick={form.handleSubmit(handleSubmit)}
          disabled={updateUser.isPending || !form.formState.isDirty}
        >
          Save
        </Button>
      </CardFooter>
    </Card>
  );
};
