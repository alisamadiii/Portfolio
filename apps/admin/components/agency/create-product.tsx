"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldError } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";

const formSchema = z.object({
  email: z.email(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number(),
  recurringInterval: z.enum(["day", "week", "month", "year"]),
});

const INTERVALS = ["day", "week", "month", "year"] as const;

export const CreateProduct = () => {
  const trpc = useTRPC();
  const create = useMutation(
    trpc.admin.agency.products.create.mutationOptions()
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      recurringInterval: "month",
    },
  });

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    console.log(data);
    create.mutate(
      { ...data, metadata: { email: data.email } },
      {
        onSuccess: () => {
          form.reset();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex max-w-sm flex-col gap-6"
    >
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error}>
            <Input
              label="Email"
              placeholder="Email"
              {...field}
              aria-invalid={!!fieldState.error}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error}>
            <Input
              label="Name"
              placeholder="Landing page"
              aria-invalid={!!fieldState.error}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="description"
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error}>
            <Textarea
              placeholder="Describe your product..."
              aria-invalid={!!fieldState.error}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="price"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <Input
                label="Price"
                type="number"
                min={0}
                step={0.01}
                placeholder="0"
                value={field.value ?? ""}
                aria-invalid={!!fieldState.error}
                onChange={(e) => {
                  const val = e.target.valueAsNumber;
                  field.onChange(Number.isFinite(val) ? val : 0);
                }}
                onBlur={field.onBlur}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="recurringInterval"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVALS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i.charAt(0).toUpperCase() + i.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      <Button type="submit" size={"lg"} isLoading={create.isPending}>
        Create Product
      </Button>
    </form>
  );
};
