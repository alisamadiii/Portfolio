"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { DataTable } from "@workspace/ui/custom/data-table";
import { urls } from "@workspace/ui/lib/company";
import { formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCheckout } from "@workspace/auth/hooks/use-payments";

import { useCurrentUser } from "../../../../packages/auth/src/hooks/use-user";

export default function PortalPage() {
  const trpc = useTRPC();
  const { data: user } = useCurrentUser();
  const products = useQuery(trpc.agency.getProducts.queryOptions());
  const { data: orders } = useQuery(trpc.agency.getOrders.queryOptions());
  const checkout = useCheckout();

  return (
    <div className="mx-auto max-w-2xl py-20">
      <Button asChild variant="outline" size="sm" className="mb-4 gap-1.5">
        <Link href="/">Back to Home</Link>
      </Button>

      <h1 className="mb-12 text-center text-4xl font-bold tracking-tight">
        Customer Portal
      </h1>

      <div className="space-y-5">
        <CardAgency.Card>
          <CardAgency.Header title="Product details" />
          {products.isLoading ? (
            <div className="flex items-center justify-center pb-4">
              <Spinner />
            </div>
          ) : !products.data ? (
            <div className="flex items-center justify-center pb-4">
              <p className="text-muted-foreground">
                Admin has not created a product yet
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              <CardAgency.DetailRow
                label="Name"
                value={products.data?.name || ""}
              />
              <CardAgency.DetailRow label="Description">
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{
                    __html: products.data?.description ?? "-",
                  }}
                />
              </CardAgency.DetailRow>

              <CardAgency.DetailRow
                label="Recurring interval"
                value={products.data?.recurringInterval || ""}
              />
              <CardAgency.DetailRow
                label="Created at"
                value={format(
                  products.data?.createdAt
                    ? new Date(products.data.createdAt)
                    : new Date(),
                  "MMMM d, yyyy"
                )}
              />
              <CardAgency.DetailRow label="Services">
                {products.data?.services?.map((service) => (
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
                  ${formatPrice(products.data?.priceAmount ?? 0)}
                </span>
              </CardAgency.DetailRow>

              {orders?.subscriptions.length === 0 && (
                <Button
                  onClick={() =>
                    checkout.mutate(
                      {
                        productId: products.data?.id ?? "",
                        successUrl: window.location.href,
                      },
                      {
                        onSuccess: () => {
                          toast.success("Subscription created");
                        },
                        onError: (error) => {
                          toast.error(error.message);
                        },
                      }
                    )
                  }
                  size="lg"
                  isLoading={checkout.isPending}
                >
                  Subscribe
                </Button>
              )}
            </div>
          )}
        </CardAgency.Card>

        <CardAgency.Card>
          <CardAgency.Header title="Customer Information">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Link href={`${urls.portfolio}/settings`}>Edit Profile</Link>
            </Button>
          </CardAgency.Header>
          <div className="grid gap-5">
            <CardAgency.DetailRow label="Name" value={user?.user.name ?? ""} />
            <CardAgency.DetailRow
              label="Email"
              value={user?.user.email ?? ""}
            />
            <CardAgency.DetailRow
              label="Phone"
              value={user?.user.phone ?? ""}
            />
            <CardAgency.DetailRow
              label="Company"
              value={user?.user.company ?? ""}
            />
            <CardAgency.DetailRow
              label="Address"
              value={user?.user.address ?? ""}
            />
            <CardAgency.DetailRow
              label="Joined"
              value={format(
                user?.user.createdAt
                  ? new Date(user.user.createdAt)
                  : new Date(),
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
                cell: ({ row }) => (
                  <div>
                    <p>{row.original.email}</p>
                    <p className="mt-2 flex flex-wrap gap-px">
                      {row.original.services.map((service) => (
                        <Badge key={service.name} variant="outline">
                          {service.name}
                        </Badge>
                      ))}
                    </p>
                  </div>
                ),
              },
              {
                id: "status",
                header: "Status",
                accessorKey: "status",
                cell: ({ row }) => (
                  <Badge
                    variant={
                      row.original.status === "active"
                        ? "default"
                        : "destructive"
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
                    {format(
                      row.original.createdAt ?? new Date(),
                      "MMM d, yyyy"
                    )}
                  </p>
                ),
              },
            ]}
            data={orders?.subscriptions ?? []}
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
                cell: ({ row }) => (
                  <div>
                    <p>{row.original.email}</p>
                    <p className="mt-2 flex flex-wrap gap-px">
                      {row.original.services.map((service) => (
                        <Badge key={service.name} variant="outline">
                          {service.name}
                        </Badge>
                      ))}
                    </p>
                  </div>
                ),
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
                    {format(
                      row.original.createdAt ?? new Date(),
                      "MMM d, yyyy"
                    )}
                  </p>
                ),
              },
            ]}
            data={orders?.orders ?? []}
          />
        </div>
      </div>
    </div>
  );
}
