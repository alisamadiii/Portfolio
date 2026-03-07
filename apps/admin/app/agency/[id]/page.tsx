"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { DataTable } from "@workspace/ui/custom/data-table";
import { formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

// ─── Page Component ──────────────────────────────────────────────
export default function AgencyProductDetail() {
  const { id } = useParams<{ id: string }>();

  const trpc = useTRPC();

  const { data: product } = useQuery(
    trpc.admin.agency.products.getProductByUserId.queryOptions(id, {
      enabled: !!id,
    })
  );
  const { data } = useQuery(
    trpc.admin.agency.products.getOrdersByUserId.queryOptions(id, {
      enabled: !!id,
    })
  );
  const createCheckout = useMutation(
    trpc.admin.agency.products.createCheckout.mutationOptions()
  );
  const { data: user } = useQuery(
    trpc.admin.users.getById.queryOptions(id, {
      enabled: !!id,
    })
  );

  console.log(product);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-1.5" asChild>
        <Link href="/agency">
          <ArrowLeft className="size-4" />
          Back to Products
        </Link>
      </Button>

      <CardAgency.Card>
        <CardAgency.Header title="Product details" />
        <div className="grid gap-5">
          <CardAgency.DetailRow label="Name" value={product?.name || ""} />
          <CardAgency.DetailRow label="Description">
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: product?.description || "" }}
            />
          </CardAgency.DetailRow>

          <CardAgency.DetailRow
            label="Recurring interval"
            value={product?.recurringInterval || ""}
          />
          <CardAgency.DetailRow
            label="Created at"
            value={format(
              product?.createdAt ? new Date(product.createdAt) : new Date(),
              "MMMM d, yyyy"
            )}
          />
          <CardAgency.DetailRow label="Services">
            {product?.services?.map((service) => (
              <p
                key={service.name}
                className="flex shrink-0 items-center justify-between gap-4"
              >
                {service.name} <span>${formatPrice(service.price)}</span>
              </p>
            ))}
          </CardAgency.DetailRow>
          <CardAgency.DetailRow label="Price">
            <span className="text-3xl font-bold tracking-tighter tabular-nums">
              ${formatPrice(product?.priceAmount ?? 0)}
            </span>
          </CardAgency.DetailRow>
        </div>
        {(data?.subscriptions.length === 0 || data?.orders.length === 0) && (
          <Button
            size={"lg"}
            className="w-full"
            isLoading={createCheckout.isPending}
            onClick={() => {
              createCheckout.mutate(
                {
                  productId: product?.id ?? "",
                },
                {
                  onSuccess: (data) => {
                    navigator.clipboard.writeText(data.url);
                    toast.success("Checkout link copied");
                  },
                  onError: (error) => {
                    console.error(product);
                    toast.error(error.message);
                  },
                }
              );
            }}
          >
            Generate Checkout Link
          </Button>
        )}
      </CardAgency.Card>

      <CardAgency.Card>
        <CardAgency.Header title="Client details" />
        <div className="grid gap-5">
          <CardAgency.DetailRow label="Name" value={user?.name ?? ""} />
          <CardAgency.DetailRow label="Email" value={user?.email ?? ""} />
          <CardAgency.DetailRow label="Phone" value={user?.phone ?? ""} />
          <CardAgency.DetailRow label="Company" value={user?.company ?? ""} />
          <CardAgency.DetailRow label="Address" value={user?.address ?? ""} />
          <CardAgency.DetailRow
            label="Joined"
            value={format(
              user?.createdAt ? new Date(user.createdAt) : new Date(),
              "MMMM d, yyyy"
            )}
          />
        </div>
      </CardAgency.Card>

      <div>
        <p className="mb-2 px-8 text-lg font-medium">Subscriptions</p>
        <DataTable
          columns={[
            {
              id: "email",
              header: "Email",
              accessorKey: "email",
            },
            {
              id: "status",
              header: "Status",
              accessorKey: "status",
              cell: ({ row }) => (
                <Badge
                  variant={
                    row.original.status === "active" ? "default" : "destructive"
                  }
                >
                  {row.original.status}
                </Badge>
              ),
            },
            {
              id: "amount",
              header: "Amount",
              accessorKey: "amount",
              cell: ({ row }) => (
                <p className="tabular-nums">
                  ${formatPrice(row.original.amount)}{" "}
                  {row.original.recurringInterval ? (
                    <span className="text-muted-foreground text-xs">/mo</span>
                  ) : (
                    ""
                  )}
                </p>
              ),
            },
            {
              id: "createdAt",
              header: "Date",
              accessorKey: "createdAt",
              cell: ({ row }) => (
                <p className="text-xs">
                  {format(row.original.createdAt ?? new Date(), "MMM d, yyyy")}
                </p>
              ),
            },
          ]}
          data={data?.subscriptions ?? []}
        />
      </div>
      <div>
        <p className="mb-2 px-8 text-lg font-medium">Orders</p>
        <DataTable
          columns={[
            {
              id: "email",
              header: "Email",
              accessorKey: "email",
            },
            {
              id: "status",
              header: "Status",
              accessorKey: "status",
              cell: ({ row }) => (
                <Badge
                  variant={
                    row.original.status === "paid" ? "default" : "destructive"
                  }
                >
                  {row.original.status}
                </Badge>
              ),
            },
            {
              id: "amount",
              header: "Amount",
              accessorKey: "amount",
              cell: ({ row }) => (
                <p className="tabular-nums">
                  ${formatPrice(row.original.totalAmount)}
                </p>
              ),
            },
            {
              id: "createdAt",
              header: "Date",
              accessorKey: "createdAt",
              cell: ({ row }) => (
                <p className="text-xs">
                  {format(row.original.createdAt ?? new Date(), "MMM d, yyyy")}
                </p>
              ),
            },
          ]}
          data={data?.orders ?? []}
        />
      </div>
    </div>
  );
}
