"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { addMonths, addYears, format, formatDistanceToNow } from "date-fns";

import { Badge } from "@workspace/ui/components/badge";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { DataTable } from "@workspace/ui/custom/data-table";
import { urls } from "@workspace/ui/lib/company";
import { design } from "@workspace/ui/lib/design";
import { cn } from "@workspace/ui/lib/utils";

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
  { label: "Motion", value: "MOTION", color: design.motion.color },
  { label: "Agency", value: "AGENCY", color: design.agency.color },
];

function getProjectColor(project?: string | null) {
  if (project === "MOTION") return design.motion.color;
  if (project === "AGENCY") return design.agency.color;
  return design.default.color;
}

export default function BillingPage() {
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const { data: user } = useCurrentUser();
  const trpc = useTRPC();

  const { data: orders, isPending: ordersLoading } = useQuery(
    trpc.payments.getInvoices.queryOptions(
      { userId: user?.user.id || "", email: user?.user.email || "" },
      { enabled: !!user?.user.id || !!user?.user.email }
    )
  );

  const { data: subscriptions, isPending: subsLoading } = useQuery(
    trpc.payments.getSubscriptions.queryOptions(
      { userId: user?.user.id || "" },
      { enabled: !!user?.user.id }
    )
  );

  const getProducts = useQuery(trpc.payments.getProducts.queryOptions());

  const userOrders = useMemo(
    () => orders?.filter((o) => o.userId === user?.user.id) || [],
    [orders, user?.user]
  );

  const filteredOrders = useMemo(
    () => (filter === "all" ? userOrders : userOrders),
    [userOrders, filter]
  );

  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return [];
    return subscriptions;
  }, [subscriptions]);

  const getNextBillingDate = (
    sub: RouterOutputs["payments"]["getSubscriptions"][number]
  ) => {
    if (!sub.periodEnd) return null;
    return new Date(sub.periodEnd);
    return null;
  };

  const formatCurrency = (amount: number, currency: string = "usd") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);

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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="aspect-16/8 w-full rounded-xl" />
            <Skeleton className="aspect-16/8 w-full rounded-xl" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
            <p className="text-muted-foreground text-sm">No orders found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredOrders.map((order) => {
              const amount = order.totalAmount / 100;
              const isRefund = amount < 0;
              const createdAtLabel = order.createdAt
                ? format(order.createdAt, "MMM d, yyyy")
                : "Date pending";
              const timeLabel = order.createdAt
                ? format(order.createdAt, "hh:mm a")
                : "Time pending";

              return (
                <div
                  key={order.id}
                  className="shadow-dialog rounded-xl p-4 text-white"
                  style={{ backgroundColor: getProjectColor(undefined) }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs tracking-[0.2em] text-white/70 uppercase">
                        Invoice
                      </p>
                      <p className="text-sm font-semibold">
                        {order.invoiceNumber || "Pending"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-white/30 text-white"
                      >
                        Invoice
                      </Badge>
                      <Badge
                        variant={
                          order.totalAmount < 0
                            ? "secondary"
                            : order.status === "paid"
                              ? "default"
                              : "destructive"
                        }
                      >
                        {order.totalAmount < 0 ? "refunded" : order.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/80">
                    <div>
                      <p className="text-white/60">Amount</p>
                      <code className="text-sm font-semibold text-white">
                        {isRefund
                          ? `-$${Math.abs(amount).toFixed(2)}`
                          : `$${amount.toFixed(2)}`}
                      </code>
                    </div>
                    <div>
                      <p className="text-white/60">Date</p>
                      <p className="text-sm font-semibold text-white">
                        {createdAtLabel}
                      </p>
                      <p className="text-[11px] text-white/60">{timeLabel}</p>
                    </div>
                    <div>
                      <p className="text-white/60">Product</p>
                      <code className="text-sm font-semibold text-white">
                        {order.productId ? order.productId.slice(0, 10) + "..." : "—"}
                      </code>
                    </div>
                    <div>
                      <p className="text-white/60">Status note</p>
                      <p className="text-sm font-semibold text-white">
                        {isRefund ? "Refund processed" : "Purchase confirmed"}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="#"
                    className={buttonVariants({
                      variant: "outline",
                      className: "mt-4 w-full text-xs text-black",
                    })}
                  >
                    Visit
                  </Link>
                  <InvoiceDownloadButton
                    order={{
                      ...order,
                      createdAt: order.createdAt
                        ? new Date(order.createdAt)
                        : null,
                    }}
                    userName={user?.user.name}
                    userPhone={user?.user.phone}
                    userCompany={user?.user.company}
                    userAddress={user?.user.address}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
