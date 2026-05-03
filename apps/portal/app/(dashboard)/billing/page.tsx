"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { DataTable } from "@workspace/ui/custom/data-table";
import {
  design,
  getProjectColor,
  projectDesign,
} from "@workspace/ui/lib/design";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

const InvoiceDownloadButton = dynamic(
  () =>
    import("@/components/settings/billing/invoice-download-button").then(
      (m) => m.InvoiceDownloadButton
    ),
  { ssr: false }
);

type ProjectFilter = "all" | "MOTION" | "AGENCY";

const filters: { label: string; value: ProjectFilter; color?: string }[] = [
  { label: "All", value: "all" },
  { label: "Motion", value: "MOTION", color: projectDesign.MOTION.color },
  { label: "Agency", value: "AGENCY", color: projectDesign.AGENCY.color },
];

type Order = RouterOutputs["billing"]["listOrders"][number];

const formatCurrency = (amount: number, currency: string = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

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

export default function BillingPage() {
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const { data: user } = useCurrentUser();
  const trpc = useTRPC();

  const { data: orders, isPending: ordersLoading } = useQuery(
    trpc.billing.listOrders.queryOptions(
      { userId: user?.user.id || "" },
      { enabled: !!user?.user.id }
    )
  );

  const { data: subscriptions, isPending: subsLoading } = useQuery(
    trpc.billing.getSubscriptions.queryOptions(
      { userId: user?.user.id || "" },
      { enabled: !!user?.user.id }
    )
  );

  const getProducts = useQuery(trpc.products.list.queryOptions());

  const filteredOrders = useMemo(() => {
    const all = orders || [];
    if (filter === "all") return all;
    return all.filter((o) => getOrderProject(o) === filter);
  }, [orders, filter]);

  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return [];
    return subscriptions;
  }, [subscriptions]);

  const getNextBillingDate = (
    sub: RouterOutputs["billing"]["getSubscriptions"][number]
  ) => {
    if (!sub.periodEnd) return null;
    return new Date(sub.periodEnd);
  };

  return (
    <div className="space-y-10">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
            className="gap-2"
            style={
              filter === f.value && f.color
                ? { backgroundColor: f.color, borderColor: f.color }
                : undefined
            }
          >
            {f.color && (
              <span
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor:
                    filter === f.value ? "#ffffff" : f.color,
                }}
              />
            )}
            {f.label}
          </Button>
        ))}
      </div>

      {/* Subscriptions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Subscriptions</h2>
        {subsLoading || getProducts.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
            <p className="text-muted-foreground text-sm">
              No subscriptions found
            </p>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                id: "plan",
                header: "Plan",
                cell: ({ row }) => {
                  return (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {row.original.productName || row.original.plan || "—"}
                      </span>
                      {row.original.status === "trialing" && (
                        <Badge
                          variant="secondary"
                          className="mt-1 w-fit text-xs"
                        >
                          Trial
                        </Badge>
                      )}
                    </div>
                  );
                },
              },
              {
                id: "status",
                header: "Status",
                cell: ({ row }) => (
                  <Badge
                    variant={
                      row.original.status === "active" ||
                      row.original.status === "trialing"
                        ? "default"
                        : row.original.status === "canceled"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {row.original.status}
                  </Badge>
                ),
              },
              {
                id: "amount",
                header: "Amount",
                cell: ({ row }) => (
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {formatCurrency(
                        row.original.totalAmount,
                        row.original.currency
                      )}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /{row.original.billingInterval ?? "mo"}
                    </span>
                  </div>
                ),
              },
              {
                id: "next_billing",
                header: "Next Billing",
                cell: ({ row }) => {
                  const next = getNextBillingDate(row.original);
                  return (
                    <span className="flex flex-col">
                      <span className="text-sm">
                        {next ? format(next, "MMM dd, yyyy") : "-"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {next
                          ? formatDistanceToNow(next, { addSuffix: true })
                          : "-"}
                      </span>
                    </span>
                  );
                },
              },
              {
                id: "auto_renewal",
                header: "Auto-Renewal",
                cell: ({ row }) => (
                  <Badge
                    variant={
                      row.original.cancelAtPeriodEnd
                        ? "destructive"
                        : "default"
                    }
                  >
                    {row.original.cancelAtPeriodEnd ? "Off" : "On"}
                  </Badge>
                ),
              },
              {
                id: "cancelled",
                header: "Cancelled",
                cell: ({ row }) => {
                  const isCancelled =
                    row.original.status === "canceled" ||
                    row.original.cancelAtPeriodEnd;
                  return (
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={isCancelled ? "destructive" : "outline"}
                        className={
                          !isCancelled
                            ? "border-green-500/30 text-green-600"
                            : ""
                        }
                      >
                        {row.original.status === "canceled"
                          ? "Cancelled"
                          : row.original.cancelAtPeriodEnd
                            ? "Cancelling"
                            : "Active"}
                      </Badge>
                      {row.original.cancelAtPeriodEnd &&
                        row.original.status !== "canceled" && (
                          <span className="text-muted-foreground text-[11px]">
                            Ends at next billing
                          </span>
                        )}
                    </div>
                  );
                },
              },
            ]}
            data={filteredSubscriptions}
          />
        )}
      </div>

      {/* Orders */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Orders</h2>
        {ordersLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
            <p className="text-muted-foreground text-sm">No orders found</p>
          </div>
        ) : (
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
                id: "amount",
                header: "Amount",
                cell: ({ row }) => {
                  const amount = row.original.amount / 100;
                  const isRefund = amount < 0;
                  return (
                    <span className={isRefund ? "text-destructive" : ""}>
                      {isRefund
                        ? `-${formatCurrency(Math.abs(row.original.amount), row.original.currency)}`
                        : formatCurrency(
                            row.original.amount,
                            row.original.currency
                          )}
                    </span>
                  );
                },
              },
              {
                id: "date",
                header: "Date",
                cell: ({ row }) =>
                  row.original.createdAt
                    ? format(row.original.createdAt, "MMM d, yyyy")
                    : "—",
              },
              {
                id: "status",
                header: "Status",
                cell: ({ row }) => {
                  const { status, amount } = row.original;
                  const isRefund = amount < 0;
                  const label = isRefund ? "refunded" : status;
                  const variant = isRefund
                    ? "secondary"
                    : status === "paid"
                      ? "default"
                      : status === "refunded" ||
                          status === "partially_refunded"
                        ? "secondary"
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
            data={filteredOrders}
          />
        )}
      </div>
    </div>
  );
}
