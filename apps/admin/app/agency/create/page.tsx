"use client";

import { useRouter } from "next/navigation";
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
import { Separator } from "@workspace/ui/components/separator";

import { useTRPC } from "@workspace/trpc/client";

import { SelectUser } from "./select-user";

const formSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  email: z.string(),
  name: z.string().min(1, "Name is required"),
  price: z.number(),
  recurringInterval: z.enum(["day", "week", "month", "year"]),
});

const INTERVALS = ["day", "week", "month", "year"] as const;

export default function AgencyCreatePage() {
  const router = useRouter();
  const trpc = useTRPC();
  const create = useMutation(
    trpc.admin.agency.products.create.mutationOptions()
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      name: "",
      price: 0,
      recurringInterval: "month",
    },
  });

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    console.log(data);
    create.mutate(
      {
        ...data,
        email: data.email,
        scope: ["BUSINESS_EMAIL", "WEBSITE_TEMPLATE"],
        userId: data.userId,
      },
      {
        onSuccess: (data) => {
          form.reset();
          router.push(`/agency/${data.id}`);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const userId = form.watch("userId");

  return (
    <div className="py-12">
      <h1 className="mb-10 text-center text-4xl font-semibold tracking-tight">
        Create Product
      </h1>

      <div className="mx-auto max-w-sm">
        <SelectUser
          userId={userId}
          onSelect={(data) => {
            form.setValue("userId", data.id);
            form.setValue("email", data.email);
          }}
        />

        <Separator className="my-8" />

        <h2 className="mb-4 text-2xl font-semibold tracking-tight">
          Create Product
        </h2>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-6"
        >
          <Controller
            control={form.control}
            name="userId"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <Input
                  label="User ID"
                  placeholder="User ID"
                  {...field}
                  aria-invalid={!!fieldState.error}
                  disabled
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
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
                  disabled
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
      </div>
    </div>
  );
}
