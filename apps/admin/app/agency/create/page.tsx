"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Field,
  FieldContent,
  FieldError,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Spinner } from "@workspace/ui/components/spinner";
import { Switch } from "@workspace/ui/components/switch";

import { useTRPC } from "@workspace/trpc/client";

import { Confirmation } from "./confirmation";
import { SelectUser } from "./select-user";

const formSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  email: z.string(),
  name: z.string().min(1, "Name is required"),
  services: z.array(
    z.object({
      name: z.string(),
      price: z.number(),
    })
  ),
  prorationBehavior: z.enum(["invoice", "prorate"]),
  isFree: z.boolean(),
  oneTimePurchase: z.boolean(),
});

export default function AgencyCreatePage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");

  const trpc = useTRPC();
  const { isLoading } = useQuery(
    trpc.admin.agency.products.getProductById.queryOptions(productId ?? "", {
      enabled: !!productId,
    })
  );

  return isLoading ? (
    <div className="flex h-48 items-center justify-center">
      <Spinner className="size-8" />
    </div>
  ) : (
    <Content productId={productId} />
  );
}

const Content = ({ productId }: { productId?: string | null }) => {
  const router = useRouter();
  const trpc = useTRPC();
  const create = useMutation(
    trpc.admin.agency.products.create.mutationOptions()
  );
  const update = useMutation(
    trpc.admin.agency.products.update.mutationOptions()
  );

  const { data: product } = useQuery(
    trpc.admin.agency.products.getProductById.queryOptions(productId ?? "", {
      enabled: !!productId,
    })
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prorationBehavior: "prorate",
      userId: productId ? (product?.userId ?? "") : "",
      email: productId ? (product?.email ?? "") : "",
      name: productId ? (product?.name ?? "") : "",
      services: productId ? (product?.services ?? []) : [],
      isFree: productId ? (product?.priceAmount === 0 ? true : false) : false,
      oneTimePurchase: productId
        ? product?.recurringInterval === null
          ? true
          : false
        : false,
    },
  });

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    if (productId) {
      update.mutate(
        {
          id: productId,
          name: data.name,
          email: data.email,
          services: data.services,
          userId: data.userId,
          oneTimePurchase: data.oneTimePurchase,
          prorationBehavior: data.prorationBehavior,
          isFree: data.isFree,
        },
        {
          onSuccess: () => {
            toast.success("Product updated successfully");
          },
          onError: (error) => {
            toast.error(error.message);
          },
        }
      );
    } else {
      create.mutate(
        {
          name: data.name,
          email: data.email,
          services: data.services,
          userId: data.userId,
          isFree: data.isFree,
          oneTimePurchase: data.oneTimePurchase,
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
    }
  };

  const userId = form.watch("userId");
  const services = form.watch("services");

  const isUpgrading =
    services.reduce((sum, s) => sum + s.price, 0) > (product?.priceAmount ?? 0);

  return (
    <div className="pt-12 pb-48">
      <h1 className="mb-10 text-center text-4xl font-semibold tracking-tight">
        Create Product
      </h1>

      <div className="mx-auto max-w-sm">
        <SelectUser
          userId={userId}
          updateState={!!productId}
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
            name="isFree"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={!!fieldState.error}
                className="dark shadow-dialog rounded-xl bg-black p-4 text-white"
              >
                <FieldContent className="flex flex-row items-center justify-between gap-2">
                  <div className="text-xl font-black">Free</div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="oneTimePurchase"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={!!fieldState.error}
                className="dark shadow-dialog rounded-xl bg-blue-500 p-4 text-white"
              >
                <FieldContent className="flex flex-row items-center justify-between gap-2">
                  <div className="text-xl font-black">One Time Purchase</div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!!productId}
                  />
                </FieldContent>
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
            email={form.watch("email")}
            userId={form.watch("userId")}
            services={form.watch("services")}
            isFree={form.watch("isFree")}
            oneTimePurchase={form.watch("oneTimePurchase")}
          />

          <Separator className="my-6" />

          {productId && (
            <Controller
              control={form.control}
              name="prorationBehavior"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className="w-full"
                      disabled={!isUpgrading || !!productId}
                    >
                      <SelectValue placeholder="Select proration behavior" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Immediate Billing</SelectItem>
                      <SelectItem value="prorate">
                        Next Billing Cycle
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground mt-2 px-2 text-xs">
                    This will be disable if the product is one time purchase
                  </p>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          )}

          <Button
            type="submit"
            size={"lg"}
            isLoading={productId ? update.isPending : create.isPending}
            disabled={!userId || services.length === 0}
            className="mt-4"
          >
            {productId ? "Update Product" : "Create Product"}
          </Button>
        </form>
      </div>
    </div>
  );
};

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
              onAddService({ name: "management_&_support", price: 100 });
              setIsOpen(false);
            }}
            disabled={services.some(
              (s) => s.name.toLowerCase() === "management_&_support"
            )}
          >
            Management & Support
          </Button>
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
