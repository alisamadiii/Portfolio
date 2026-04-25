import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldError } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCreateUser } from "@workspace/auth/src/hooks/use-admin";

const createUserSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required",
  }),
  email: z.string().email({
    message: "Email address is required",
  }),
});

export const SelectUser = ({
  userId,
  onSelect,
  updateState,
}: {
  userId: string;
  onSelect: ({
    id,
    email,
    name,
  }: {
    id: string;
    email: string;
    name: string;
  }) => void;
  updateState?: boolean;
}) => {
  const [search, setSearch] = useState("");
  const debouncedSearchTerm = useDebounce(search, 300);

  const [isOpen, setIsOpen] = useState(false);

  const trpc = useTRPC();
  const {
    data: users,
    isPending,
    error,
  } = useQuery(
    trpc.users.getAll.queryOptions({
      search: debouncedSearchTerm,
    })
  );

  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const create = useCreateUser();

  const handleSubmit = (values: z.infer<typeof createUserSchema>) => {
    create.mutate(
      {
        ...values,
        role: "user",
      },
      {
        onSuccess: (data) => {
          form.reset();
          onSelect({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
          });
        },
        onError: (error) => {
          console.error(error);
        },
      }
    );
  };

  const selectedUser = users?.find((user) => user.id === userId);

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">
        Create User
      </h2>
      {userId ? (
        <div className="bg-muted rounded-md border p-4 text-sm">
          <p className="text-sm font-medium">{selectedUser?.email}</p>
          <p className="text-muted-foreground text-xs">{selectedUser?.name}</p>
        </div>
      ) : (
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
                  placeholder="Name"
                  {...field}
                  aria-invalid={!!fieldState.error}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Button type="submit" size={"lg"} isLoading={create.isPending}>
            Create User
          </Button>
        </form>
      )}
      <div className="text-muted-foreground my-2 text-center">or</div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size={"lg"}
            className="w-full"
            disabled={updateState}
          >
            Select User
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 animate-none!">
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <RadioGroup className="flex flex-col gap-2">
            {users?.map((user) => (
              <Label
                key={user.id}
                className={cn(
                  "bg-muted flex items-center justify-between gap-2 rounded-md p-2 px-4 outline",
                  userId === user.id && "outline-2 outline-blue-500"
                )}
                onClick={() => {
                  if (userId === user.id) {
                    onSelect({ id: "", email: "", name: "" });
                    setIsOpen(false);
                    return;
                  }
                  onSelect({ id: user.id, email: user.email, name: user.name });
                  setIsOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-muted-foreground text-xs">{user.name}</p>
                </div>
                <RadioGroupItem value={user.id} checked={userId === user.id} />
              </Label>
            ))}
          </RadioGroup>
        </PopoverContent>
      </Popover>
    </div>
  );
};
