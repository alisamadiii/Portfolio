"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { DataTable } from "@workspace/ui/custom/data-table";
import { getProjectColor } from "@workspace/ui/lib/design";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

const InvoiceDownloadButton = dynamic(
  () =>
    import("./invoice-download-button").then((m) => m.InvoiceDownloadButton),
  { ssr: false }
);

type Order = RouterOutputs["billing"]["listOrders"][number];

type OrderMeta = { project?: string; name?: string } | null;

function getOrderMeta(order: Order): OrderMeta {
  return order.metadata as OrderMeta;
}

function getOrderProject(order: Order): string | undefined {
  return getOrderMeta(order)?.project ?? undefined;
}

function getOrderProductName(order: Order): string {
  if (order.productName) return order.productName;
  const meta = getOrderMeta(order);
  if (meta?.name) return meta.name;
  if (meta?.project) return meta.project;
  if (order.billingReason === "subscription") return "Subscription";
  return "Purchase";
}

export const BillingInvoices = () => {
  const { data: user } = useCurrentUser();

  const trpc = useTRPC();
  const { data: orders, isLoading } = useQuery(
    trpc.billing.listOrders.queryOptions(
      { userId: user?.user.id || "" },
      { enabled: !!user?.user.id, refetchOnWindowFocus: true }
    )
  );

  return (
    <div className="space-y-4">
      <h3 className="text-muted-foreground relative z-10 mt-4 text-sm">
        Orders
      </h3>
      <DataTable
        columns={[
          {
            id: "product",
            header: "Product",
            cell: ({ row }) => {
              const project = getOrderProject(row.original);
              const color = getProjectColor(project);
              return (
                <div className="flex items-center gap-3">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium">
                    {getOrderProductName(row.original)}
                  </span>
                </div>
              );
            },
          },
          {
            header: "Amount",
            accessorKey: "amount",
            cell: ({ row }) => {
              const amount = row.original.amount / 100;
              return <span>${amount.toFixed(2)}</span>;
            },
          },
          {
            header: "Date",
            accessorKey: "createdAt",
            cell: ({ row }) =>
              row.original.createdAt
                ? format(row.original.createdAt, "MMM d, yyyy")
                : "—",
          },
          {
            header: "Status",
            accessorKey: "status",
            cell: ({ row }) => {
              const { status, amount } = row.original;
              const isRefund = amount < 0;
              const label = isRefund
                ? "refunded"
                : status === "partially_refunded"
                  ? "partial refund"
                  : status;
              const variant = isRefund
                ? "secondary"
                : status === "paid"
                  ? "default"
                  : status === "refunded"
                    ? "secondary"
                    : status === "partially_refunded"
                      ? "outline"
                      : status === "void"
                        ? "destructive"
                        : "secondary";
              return <Badge variant={variant}>{label}</Badge>;
            },
          },
          {
            id: "receipt",
            cell: ({ row }) =>
              row.original.receiptUrl ? (
                <a
                  href={row.original.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="size-3" />
                    Receipt
                  </Button>
                </a>
              ) : null,
          },
          {
            id: "invoice",
            cell: ({ row }) => (
              <InvoiceDownloadButton
                order={{
                  ...row.original,
                  createdAt: row.original.createdAt
                    ? new Date(row.original.createdAt)
                    : null,
                }}
                userName={user?.user.name}
                userPhone={user?.user.phone}
                userCompany={user?.user.company}
                userAddress={user?.user.address}
              />
            ),
          },
        ]}
        data={orders ?? []}
        isLoading={isLoading}
      />
    </div>
  );
};
