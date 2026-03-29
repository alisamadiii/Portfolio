"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Field, FieldError } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Spinner } from "@workspace/ui/components/spinner";
import {
  SERVICE_CATALOG,
  SERVICE_CATEGORIES,
} from "@workspace/ui/lib/agency-utils";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { Confirmation } from "./confirmation";
import { SelectUser } from "./select-user";

// ─── Form schema ──────────────────────────────────────────────────────────────

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
});

// ─── Page ─────────────────────────────────────────────────────────────────────

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

// ─── Content ──────────────────────────────────────────────────────────────────

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
          oneTimePurchase: false,
          prorationBehavior: data.prorationBehavior,
          isFree: false,
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
          isFree: false,
          oneTimePurchase: false,
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

          <Separator className="my-2" />

          <ServiceSelector
            services={services}
            onChange={(updated) => form.setValue("services", updated)}
          />

          <Separator className="my-6" />

          <Confirmation
            name={form.watch("name")}
            email={form.watch("email")}
            userId={form.watch("userId")}
            services={form.watch("services")}
            isFree={false}
            oneTimePurchase={false}
          />

          <Separator className="my-6" />

          {productId && (
            <Controller
              control={form.control}
              name="prorationBehavior"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" disabled={!isUpgrading}>
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
                    Disabled if no price increase
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

// ─── Service selector ─────────────────────────────────────────────────────────

const ServiceSelector = ({
  services,
  onChange,
}: {
  services: { name: string; price: number }[];
  onChange: (services: { name: string; price: number }[]) => void;
}) => {
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        SERVICE_CATALOG.map((s) => {
          const existing = services.find((srv) => srv.name === s.id);
          return [s.id, existing?.price ?? s.defaultPrice];
        })
      )
  );

  const isEnabled = (id: string) => services.some((s) => s.name === id);

  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...services, { name: id, price: priceOverrides[id] ?? 0 }]);
    } else {
      onChange(services.filter((s) => s.name !== id));
    }
  };

  const updatePrice = (id: string, dollars: number) => {
    const cents = Math.round(dollars * 100);
    setPriceOverrides((prev) => ({ ...prev, [id]: cents }));
    if (isEnabled(id)) {
      onChange(
        services.map((s) => (s.name === id ? { ...s, price: cents } : s))
      );
    }
  };

  const total = services.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Services</h2>
        {services.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {services.length} selected &mdash;{" "}
            <span className="text-foreground font-semibold">
              ${(total / 100).toFixed(2)}
            </span>
          </p>
        )}
      </div>

      {SERVICE_CATEGORIES.map((category) => {
        const items = SERVICE_CATALOG.filter((s) => s.category === category);
        return (
          <div key={category} className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {category}
            </p>
            {items.map((service) => {
              const enabled = isEnabled(service.id);
              const priceDollars = (priceOverrides[service.id] ?? 0) / 100;
              return (
                <Label
                  key={service.id}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition-colors",
                    enabled ? "bg-primary/5 border-primary/30" : "bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        toggle(service.id, !!checked)
                      }
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="text-sm leading-none font-medium">
                        {service.label}
                      </span>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {service.description}
                      </p>
                      {enabled && (
                        <div
                          className="mt-1 flex items-center gap-2"
                          onClick={(e) => e.preventDefault()}
                        >
                          <span className="text-muted-foreground text-xs">
                            $
                          </span>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={priceDollars}
                            onChange={(e) =>
                              updatePrice(service.id, Number(e.target.value))
                            }
                            className="h-8 w-28 text-sm"
                          />
                          <span className="text-muted-foreground text-xs">
                            / mo
                          </span>
                        </div>
                      )}
                    </div>
                    {!enabled && (
                      <span className="text-muted-foreground shrink-0 text-sm font-medium tabular-nums">
                        ${(service.defaultPrice / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                </Label>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
