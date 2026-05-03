"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { DataTable } from "@workspace/ui/custom/data-table";
import { getProjectColor, projectDesign } from "@workspace/ui/lib/design";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import {
  useGeneratePortalLink,
  useSubscriptionDetails,
} from "@workspace/auth/hooks/use-payments";

const InvoiceDownloadButton = dynamic(
  () =>
    import("@/components/settings/billing/invoice-download-button").then(
      (m) => m.InvoiceDownloadButton
    ),
  { ssr: false }
);

// ─── Types ──────────────────────────────────────────────────────

type ProjectFilter = "all" | "MOTION" | "AGENCY";
type Order = RouterOutputs["billing"]["listOrders"][number];
type Subscription = RouterOutputs["billing"]["getSubscriptions"][number];
type OrderMeta = { project?: string; name?: string } | null;

// ─── Helpers ────────────────────────────────────────────────────

const filters: { label: string; value: ProjectFilter; color?: string }[] = [
  { label: "All", value: "all" },
  { label: "Motion", value: "MOTION", color: projectDesign.MOTION.color },
  { label: "Agency", value: "AGENCY", color: projectDesign.AGENCY.color },
];

const STATUS_COLORS: Record<Subscription["status"], string> = {
  active: "bg-emerald-500",
  trialing: "bg-blue-500",
  past_due: "bg-amber-500",
  canceled: "bg-red-500",
  unpaid: "bg-orange-500",
  incomplete: "bg-yellow-500",
  incomplete_expired: "bg-gray-400",
  paused: "bg-violet-500",
};

const formatCurrency = (amount: number, currency: string = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

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

// ─── StatusDot ──────────────────────────────────────────────────

function StatusDot({
  status,
  isCanceling,
}: {
  status: Subscription["status"];
  isCanceling?: boolean;
}) {
  const color =
    isCanceling && status === "active"
      ? "bg-amber-500"
      : (STATUS_COLORS[status] ?? "bg-gray-400");

  return (
    <span
      className={cn("inline-block size-2.5 shrink-0 rounded-full", color)}
    />
  );
}

// ─── Subscription Details Panel ─────────────────────────────────

function SubscriptionDetailsPanel({
  subscriptionId,
  sub,
}: {
  subscriptionId: string;
  sub: Subscription;
}) {
  const { data, isLoading, error } = useSubscriptionDetails(subscriptionId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground text-xs">Status</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <StatusDot
              status={sub.status}
              isCanceling={!!(sub.cancelAtPeriodEnd || sub.cancelAt)}
            />
            <span className="capitalize">
              {sub.cancelAtPeriodEnd || sub.cancelAt ? "canceling" : sub.status}
            </span>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Auto-Renewal</p>
          <Badge
            variant={
              sub.cancelAtPeriodEnd || sub.cancelAt ? "destructive" : "default"
            }
            className="mt-0.5"
          >
            {sub.cancelAtPeriodEnd || sub.cancelAt ? "Off" : "On"}
          </Badge>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Subscription ID</p>
          <span className="text-muted-foreground block truncate font-mono text-xs">
            {sub.stripeSubscriptionId ?? "—"}
          </span>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Billing Interval</p>
          <span className="capitalize">{sub.billingInterval ?? "—"}</span>
        </div>
        {sub.cancelAt && (
          <div>
            <p className="text-muted-foreground text-xs">Cancels At</p>
            <span>{format(new Date(sub.cancelAt), "MMM d, yyyy")}</span>
          </div>
        )}
        {sub.canceledAt && (
          <div>
            <p className="text-muted-foreground text-xs">Canceled At</p>
            <span>{format(new Date(sub.canceledAt), "MMM d, yyyy")}</span>
          </div>
        )}
        {sub.trialEnd && (
          <div>
            <p className="text-muted-foreground text-xs">Trial Ends</p>
            <span>{format(new Date(sub.trialEnd), "MMM d, yyyy")}</span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading items...
        </div>
      )}

      {error && !data && (
        <p className="text-muted-foreground text-sm">
          Could not load subscription items.
        </p>
      )}

      {data?.scheduledChange && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Scheduled plan change
          </p>
          <p className="text-amber-700 dark:text-amber-300">
            Switching to{" "}
            <span className="font-medium">
              {data.scheduledChange.newProductName ?? "new plan"}
            </span>{" "}
            on{" "}
            {format(
              new Date(data.scheduledChange.effectiveDate * 1000),
              "MMM d, yyyy"
            )}
          </p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Interval</th>
                <th className="px-3 py-2 font-medium">Qty</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">
                    {item.productName ?? (
                      <span className="text-muted-foreground font-mono text-xs">
                        {item.productId?.slice(0, 16)}...
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    ${(item.unitAmount / 100).toFixed(2)}{" "}
                    <span className="text-muted-foreground uppercase">
                      {item.currency}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {item.interval
                      ? `Every ${item.intervalCount && item.intervalCount > 1 ? `${item.intervalCount} ` : ""}${item.interval}`
                      : "One-time"}
                  </td>
                  <td className="px-3 py-2">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function BillingPage() {
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { data: user } = useCurrentUser();
  const trpc = useTRPC();
  const generatePortalLink = useGeneratePortalLink();

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

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
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
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Subscriptions</h2>
          <Button
            variant="outline"
            size="icon"
            disabled={generatePortalLink.isPending}
            onClick={() =>
              generatePortalLink.mutate({ returnUrl: "/billing" })
            }
          >
            {generatePortalLink.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CreditCard className="size-4" />
            )}
          </Button>
        </div>
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
                  const isCanceling = !!(
                    row.original.cancelAtPeriodEnd || row.original.cancelAt
                  );
                  return (
                    <div className="flex items-center gap-2.5">
                      <StatusDot
                        status={row.original.status}
                        isCanceling={isCanceling}
                      />
                      <span className="max-w-[140px] truncate font-medium">
                        {row.original.productName || row.original.plan || "—"}
                      </span>
                    </div>
                  );
                },
              },
              {
                id: "price",
                header: "Price",
                cell: ({ row }) => {
                  if (!row.original.totalAmount)
                    return (
                      <span className="text-muted-foreground">—</span>
                    );
                  return (
                    <span className="text-sm">
                      ${(row.original.totalAmount / 100).toFixed(2)}
                      <span className="text-muted-foreground ml-1 text-xs uppercase">
                        {row.original.currency}
                      </span>
                    </span>
                  );
                },
              },
              {
                id: "next_billing",
                header: "Next Billing",
                cell: ({ row }) => {
                  const end = row.original.periodEnd;
                  return (
                    <span className="flex flex-col">
                      <span className="text-sm">
                        {end
                          ? format(new Date(end), "MMM dd, yyyy")
                          : "-"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {end
                          ? formatDistanceToNow(new Date(end), {
                              addSuffix: true,
                            })
                          : "-"}
                      </span>
                    </span>
                  );
                },
              },
              {
                id: "actions",
                header: "",
                cell: ({ row }) => {
                  const isExpanded = expandedRows.has(row.id);
                  if (!row.original.stripeSubscriptionId) return null;
                  return (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(row.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                        More Info
                      </Button>
                    </div>
                  );
                },
              },
            ]}
            data={filteredSubscriptions}
            expandedRows={expandedRows}
            renderExpandedRow={(row) => {
              const sub = row.original;
              if (!sub.stripeSubscriptionId) return null;
              return (
                <SubscriptionDetailsPanel
                  subscriptionId={sub.stripeSubscriptionId}
                  sub={sub}
                />
              );
            }}
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
