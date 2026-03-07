"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Button } from "@workspace/ui/components/button";
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

      <CardAgency.ClientDetails
        name={user?.name ?? ""}
        email={user?.email ?? ""}
        phone={user?.phone ?? ""}
        company={user?.company ?? ""}
        address={user?.address ?? ""}
        joinedAt={user?.createdAt ? new Date(user.createdAt) : new Date()}
      />

      <CardAgency.SubscriptionsDetails
        subscriptions={
          data?.subscriptions?.map((subscription) => ({
            id: subscription.id,
            status: subscription.status,
            amount: subscription.amount,
            email: subscription.email,
            createdAt: subscription.createdAt
              ? new Date(subscription.createdAt)
              : new Date(),
            // Safely check before parsing dates (currentPeriodEnd might not exist)
            currentPeriodEnd: subscription.cancelAtPeriodEnd
              ? new Date(subscription.canceledAt || new Date())
              : new Date(),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            canceledAt: subscription.canceledAt
              ? new Date(subscription.canceledAt)
              : null,
          })) ?? []
        }
      />

      <CardAgency.OrdersDetails
        orders={
          data?.orders?.map((order) => ({
            id: order.id,
            status: order.status,
            amount: order.totalAmount,
            email: order.email,
            createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
            currentPeriodEnd: order.createdAt
              ? new Date(order.createdAt)
              : new Date(),
            cancelAtPeriodEnd: false,
            canceledAt: null,
          })) ?? []
        }
      />
    </div>
  );
}
