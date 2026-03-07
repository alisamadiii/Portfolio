"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
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

import { Confirmation } from "./confirmation";
import { SelectUser } from "./select-user";

const formSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  email: z.string(),
  name: z.string().min(1, "Name is required"),
  recurringInterval: z.enum(["month", "year"]),
  services: z.array(
    z.object({
      name: z.string(),
      price: z.number(),
    })
  ),
});

const INTERVALS = ["month", "year"] as const;

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
      email: "",
      name: "",
      recurringInterval: "month",
      services: [
        {
          name: "management_&_support",
          price: 10000,
        },
      ],
    },
  });

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    create.mutate(
      {
        name: data.name,
        email: data.email,
        recurringInterval: data.recurringInterval,
        services: data.services,
        userId: data.userId,
      },
      {
        onSuccess: () => {
          form.reset();
          router.push(`/agency/${data.userId}`);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const userId = form.watch("userId");
  const services = form.watch("services");

  return (
    <div className="pt-12 pb-48">
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
          className="flex flex-col gap-4"
        >
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
            name="recurringInterval"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" disabled>
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

          <p className="mt-4 mb-2">
            Select the services you want to offer to the user.
          </p>

          <div className="flex flex-col gap-2">
            {services.map((service, index) => (
              <div
                key={service.name}
                className="bg-muted flex items-center justify-between gap-2 rounded-xl border p-4 pr-2"
              >
                <p className="text-sm font-medium">{service.name}</p>
                <div className="flex items-center">
                  <p className="text-xl font-bold">
                    ${(service.price / 100).toFixed(2)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => {
                      form.setValue(
                        "services",
                        services.filter((s) => s.name !== service.name)
                      );
                    }}
                    disabled={index === 0}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <AddService
            onAdd={(data) => {
              form.setValue("services", [...services, data]);
            }}
            services={services}
          />

          <Separator className="my-6" />

          <Confirmation
            name={form.watch("name")}
            recurringInterval={form.watch("recurringInterval")}
            email={form.watch("email")}
            userId={form.watch("userId")}
            services={form.watch("services")}
          />

          <Separator className="my-6" />

          <Button
            type="submit"
            size={"lg"}
            isLoading={create.isPending}
            disabled={!userId || services.length === 0}
            className="mt-4"
          >
            Create Product
          </Button>
        </form>
      </div>
    </div>
  );
}

const addServiceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().min(0, "Price is required"),
});

const AddService = ({
  onAdd,
  services,
}: {
  onAdd: (data: z.infer<typeof addServiceFormSchema>) => void;
  services: z.infer<typeof addServiceFormSchema>[];
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof addServiceFormSchema>>({
    resolver: zodResolver(addServiceFormSchema),
    defaultValues: {
      name: "",
      price: undefined,
    },
  });

  const onAddService = (data: z.infer<typeof addServiceFormSchema>) => {
    if (
      services.some(
        (s) =>
          s.name.toLowerCase() === data.name.toLowerCase().replaceAll(" ", "_")
      )
    ) {
      toast.error("Service already exists");
      return;
    }

    onAdd({
      name: data.name.toLowerCase().replaceAll(" ", "_"),
      price: data.price * 100,
    });
    setIsOpen(false);
    form.reset();
  };

  const handleSubmit = (data: z.infer<typeof addServiceFormSchema>) => {
    onAddService(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg">Add Service</Button>
      </DialogTrigger>
      <DialogContent className="animate-none!">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <Input
                  label="Name"
                  placeholder="Name"
                  aria-invalid={!!fieldState.error}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="price"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <Input
                  label="Price"
                  type="number"
                  placeholder="will be in cents automatically"
                  aria-invalid={!!fieldState.error}
                  {...field}
                  onChange={(e) => {
                    field.onChange(Number(e.target.value));
                  }}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            size="lg"
          >
            Add Service
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              form.setValue("name", "Buying Domain");
            }}
            disabled={services.some(
              (s) => s.name.toLowerCase() === "buying domain"
            )}
          >
            Buying Domain
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onAddService({ name: "business_email", price: 8.4 });
              setIsOpen(false);
            }}
            disabled={services.some(
              (s) => s.name.toLowerCase() === "business email"
            )}
          >
            Business Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onAddService({ name: "website_template", price: 15 });
              setIsOpen(false);
            }}
            disabled={services.some(
              (s) => s.name.toLowerCase() === "website template"
            )}
          >
            Website Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
