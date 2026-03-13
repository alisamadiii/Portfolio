"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { Badge } from "@workspace/ui/components/badge";
import { DataTable } from "@workspace/ui/custom/data-table";
import { formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

export default function OrdersPage() {
  const trpc = useTRPC();
  const { data: orders } = useQuery(trpc.agency.getOrders.queryOptions());

  return (
    <div className="space-y-5">
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
                  {format(row.original.createdAt ?? new Date(), "MMM d, yyyy")}
                </p>
              ),
            },
          ]}
          data={orders?.orders ?? []}
        />
      </div>
    </div>
  );
}
