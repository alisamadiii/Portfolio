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
import { FieldError } from "@workspace/ui/components/field";

import { TextField } from "@/components/ui/form-fields";

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
    // Same cast as entry-form.tsx — the hoisted zod v4 types leak into the
    // resolver signature while the app itself is on zod v3.
    resolver: zodResolver(
      schema as unknown as Parameters<typeof zodResolver>[0]
    ),
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
              <TextField
                label="Phone"
                placeholder="+1 (971) 382-8969"
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
                {...field}
              />
            )}
          />

          <Controller
            control={form.control}
            name="company"
            render={({ field, fieldState }) => (
              <TextField
                label="Company"
                placeholder="AliSamadiiLLC"
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
                {...field}
              />
            )}
          />

          <Controller
            control={form.control}
            name="address"
            render={({ field, fieldState }) => (
              <TextField
                label="Address"
                placeholder="Oregon, USA"
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
                {...field}
              />
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
