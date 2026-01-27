import { useState } from "react";
import { useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { storage } from "@/project.config";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import { useTRPC } from "@workspace/trpc/client";

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Name must be at least 3 characters",
  }),
});

export const PersonalInformation = () => {
  const [newAvatar, setNewAvatar] = useState<File | null>(null);

  const { uploadFiles } = storage.useUpload();

  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();
  const { data: user } = useQuery(
    trpc.admin.users.getById.queryOptions(id, {
      enabled: !!id,
    })
  );

  const updateUser = useMutation(
    useTRPC().admin.users.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to update user");
      },
    })
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    updateUser.mutate(
      {
        id,
        name: values.name,
      },
      {
        onSuccess: () => {
          form.reset({
            name: values.name,
          });
        },
      }
    );
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage
            src={
              newAvatar ? URL.createObjectURL(newAvatar) : (user?.image ?? "")
            }
          />
          <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <Label
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "px-2",
            })}
          >
            <input
              type="file"
              onChange={async (e) => {
                if (e.target.files?.[0]) {
                  setNewAvatar(e.target.files[0]);
                  try {
                    const result = await uploadFiles(
                      [
                        {
                          file: e.target.files[0],
                          name: id,
                        },
                      ],
                      {
                        path: "public/users",
                      }
                    );
                    if (result) {
                      updateUser.mutate({
                        id,
                        image: result[0] + `?${Date.now()}`,
                      });
                    }
                  } catch (error) {
                    toast.error("Failed to upload avatar", {
                      description:
                        error instanceof Error
                          ? error.message
                          : "Unknown error",
                    });
                  }
                }
              }}
              className="sr-only"
            />
            Add avatar
          </Label>
          <p className="text-muted-foreground text-xs">
            Recommend size 1:1, up to 2mb
          </p>
        </div>
      </div>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mt-6 flex flex-col gap-4"
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
      </form>

      {/* <ToastSave
        isDirty={form.formState.isDirty}
        onReset={() => form.reset()}
        onSave={() => submitButtonRef.current?.click()}
        isLoading={updateUser.isPending}
        isSuccess={updateUser.isSuccess}
        isError={
          Object.keys(form.formState.errors).length > 0 || updateUser.isError
        }
      /> */}
    </div>
  );
};
