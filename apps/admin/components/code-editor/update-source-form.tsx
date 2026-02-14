import React from "react";
import { useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@workspace/ui/components/button";
import { Field } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { useTRPC } from "@workspace/trpc/client";

const formSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  imageUrl: z.union([z.literal(""), z.url()]).optional(),
  darkImageUrl: z.union([z.literal(""), z.url()]).optional(),
  videoUrl: z.union([z.literal(""), z.url()]).optional(),
  darkVideoUrl: z.union([z.literal(""), z.url()]).optional(),
});

export const UpdateFormSource = () => {
  const params = useParams<{ id: string }>();
  const sourceId = params.id;

  const trpc = useTRPC();
  const getSource = useQuery(
    trpc.admin.sources.readById.queryOptions(sourceId)
  );
  const updateSource = useMutation(trpc.admin.sources.update.mutationOptions());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: getSource.data?.title || "",
      description: getSource.data?.description || "",
      imageUrl: getSource.data?.imageUrl || "",
      darkImageUrl: getSource.data?.darkImageUrl || "",
      videoUrl: getSource.data?.videoUrl || "",
      darkVideoUrl: getSource.data?.darkVideoUrl || "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log(values);
    updateSource.mutate(
      {
        id: sourceId,
        ...values,
      },
      {
        onSuccess: () => {
          toast.success("Source updated successfully");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update source");
        },
      }
    );
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="bg-muted w-full max-w-xl space-y-4 rounded-xl border p-4"
    >
      <Controller
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <Input
              label="Title"
              placeholder="Title"
              {...field}
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="description"
        render={({ field, fieldState }) => (
          <Field>
            <Input
              label="Description"
              placeholder="Description"
              {...field}
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="imageUrl"
        render={({ field, fieldState }) => (
          <Field>
            <Input
              label="Image"
              placeholder="Image"
              {...field}
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="darkImageUrl"
        render={({ field, fieldState }) => (
          <Field>
            <Input
              label="Dark Image"
              placeholder="Dark Image"
              {...field}
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="videoUrl"
        render={({ field, fieldState }) => (
          <Field>
            <Input
              label="Video"
              placeholder="Video"
              {...field}
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="darkVideoUrl"
        render={({ field, fieldState }) => (
          <Field>
            <Input
              label="Dark Video"
              placeholder="Dark Video"
              {...field}
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )}
      />
      <Button
        type="submit"
        isLoading={updateSource.isPending}
        disabled={!form.formState.isDirty}
        size="lg"
        className="w-full"
      >
        Save
      </Button>
    </form>
  );
};
