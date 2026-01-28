import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { queryClient, useTRPC } from "@workspace/trpc/client";

const formSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
});

export const CreateForm = () => {
  const trpc = useTRPC();
  const create = useMutation(trpc.source.create.mutationOptions());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    create.mutate(values, {
      onSuccess: () => {
        form.reset();
        queryClient.invalidateQueries({
          queryKey: trpc.source.read.pathKey(),
        });
      },
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="max-w-sm space-y-4"
    >
      <Controller
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Title</FieldLabel>
            <FieldContent>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                placeholder="Title"
              />
            </FieldContent>
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="description"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Description</FieldLabel>
            <FieldContent>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                placeholder="Description"
              />
            </FieldContent>
          </Field>
        )}
      />
      <Button type="submit" isLoading={create.isPending}>
        Create
      </Button>
    </form>
  );
};
