"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Button } from "@workspace/ui/components/button";

import { useTRPC } from "@workspace/trpc/client";

const mockClient = {
  name: "Acme Corp",
  email: "hello@acme.dev",
  phone: "+1 (555) 867-5309",
  company: "Acme Corp",
  address: "123 Innovation Blvd, San Francisco, CA 94107",
  joinedAt: new Date("2025-06-01T00:00:00Z"),
};

// ─── Page Component ──────────────────────────────────────────────
export default function AgencyProductDetail() {
  const { id } = useParams<{ id: string }>();

  // In production, fetch real data using `id`:
  // const { data: product } = useQuery(
  //   trpc.admin.agency.products.getProduct.queryOptions(id)
  // );
  // For now, use mock data:
  const client = mockClient;

  const trpc = useTRPC();

  const { data: products } = useQuery(
    trpc.admin.agency.products.getProductsByUserId.queryOptions(id, {
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

  console.log(data);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-1.5" asChild>
        <Link href="/agency">
          <ArrowLeft className="size-4" />
          Back to Products
        </Link>
      </Button>

      {products?.map((product) => (
        <CardAgency.ProductDetails
          key={product.id}
          name={product.name}
          description={product.description || ""}
          price={product.priceAmount}
          recurringInterval={product.recurringInterval || ""}
          createdAt={
            product.createdAt ? new Date(product.createdAt) : new Date()
          }
          scope={product.scope}
        >
          {(data?.subscriptions.length === 0 || data?.orders.length === 0) && (
            <Button
              size={"lg"}
              className="w-full"
              isLoading={createCheckout.isPending}
              onClick={() => {
                createCheckout.mutate(
                  {
                    productId: product.id,
                  },
                  {
                    onSuccess: (data) => {
                      navigator.clipboard.writeText(data.url);
                      toast.success("Checkout link copied");
                    },
                    onError: (error) => {
                      toast.error(error.message);
                    },
                  }
                );
              }}
            >
              Generate Checkout Link
            </Button>
          )}
        </CardAgency.ProductDetails>
      ))}

      <CardAgency.ClientDetails
        name={client.name}
        email={client.email}
        phone={client.phone}
        company={client.company}
        address={client.address}
        joinedAt={client.joinedAt}
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
