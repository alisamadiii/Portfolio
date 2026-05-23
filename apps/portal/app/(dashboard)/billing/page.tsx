"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CreditCard,
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
import { useGeneratePortalLink } from "@workspace/auth/hooks/use-payments";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

const InvoiceDownloadButton = dynamic(
  () =>
    import("@/components/settings/billing/invoice-download-button").then(
      (m) => m.InvoiceDownloadButton
    ),
  { ssr: false }
);

// ─── Types ──────────────────────────────────────────────────────

type ProjectFilter = "all" | "MOTION" | "AGENCY";
type Order = RouterOutputs["payments"]["listOrders"][number];
type Subscription = RouterOutputs["payments"]["getSubscriptions"][number];
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
  sub,
}: {
  subscriptionId: string;
  sub: Subscription;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground text-xs">Status</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <StatusDot
              status={sub.status}
              isCanceling={!!(sub.cancelAtPeriodEnd || sub.canceledAt)}
            />
            <span className="capitalize">
              {sub.cancelAtPeriodEnd || sub.canceledAt
                ? "canceling"
                : sub.status}
            </span>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Auto-Renewal</p>
          <Badge
            variant={
              sub.cancelAtPeriodEnd || sub.canceledAt
                ? "destructive"
                : "default"
            }
            className="mt-0.5"
          >
            {sub.cancelAtPeriodEnd || sub.canceledAt ? "Off" : "On"}
          </Badge>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Subscription ID</p>
          <span className="text-muted-foreground block truncate font-mono text-xs">
            {sub.id ?? "—"}
          </span>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Billing Interval</p>
          <span className="capitalize">{sub.recurringInterval ?? "—"}</span>
        </div>
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
  const { data: clientData } = useQuery(
    trpc.clients.getCurrent.queryOptions(undefined, {
      enabled: !!user,
    })
  );

  const { data: orders, isPending: ordersLoading } = useQuery(
    trpc.payments.listOrders.queryOptions(
      { userId: user?.user.id || "" },
      { enabled: !!user?.user.id }
    )
  );

  const { data: subscriptions, isPending: subsLoading } = useQuery(
    trpc.payments.getSubscriptions.queryOptions(
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
                  backgroundColor: filter === f.value ? "#ffffff" : f.color,
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
            onClick={() => generatePortalLink.mutate()}
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
                    row.original.cancelAtPeriodEnd || row.original.canceledAt
                  );
                  return (
                    <div className="flex items-center gap-2.5">
                      <StatusDot
                        status={row.original.status}
                        isCanceling={isCanceling}
                      />
                      <span className="max-w-[140px] truncate font-medium">
                        {row.original.productName ||
                          row.original.productId ||
                          "—"}
                      </span>
                    </div>
                  );
                },
              },
              {
                id: "price",
                header: "Price",
                cell: ({ row }) => {
                  if (!row.original.amount)
                    return <span className="text-muted-foreground">—</span>;
                  return (
                    <span className="text-sm">
                      ${(row.original.amount / 100).toFixed(2)}
                      <span className="text-muted-foreground ml-1 text-xs uppercase">
                        {"usd"}
                      </span>
                    </span>
                  );
                },
              },
              {
                id: "next_billing",
                header: "Next Billing",
                cell: ({ row }) => {
                  const end = row.original.startedAt;
                  return (
                    <span className="flex flex-col">
                      <span className="text-sm">
                        {end ? format(new Date(end), "MMM dd, yyyy") : "-"}
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
                  if (!row.original.id) return null;
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
              if (!sub.id) return null;
              return (
                <SubscriptionDetailsPanel subscriptionId={sub.id} sub={sub} />
              );
            }}
          />
        )}
        {clientData?.stripeCustomerId && (
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <p className="text-muted-foreground text-sm">
              You have an agency account. View your Stripe-managed subscriptions
              and invoices on the Agency page.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1.5"
              render={<Link href="/agency" />}
            >
                Agency
                <ArrowRight className="size-3.5" />
            </Button>
          </div>
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
                  const amount = row.original.totalAmount / 100;
                  const isRefund = amount < 0;
                  return (
                    <span className={isRefund ? "text-destructive" : ""}>
                      {isRefund
                        ? `-${formatCurrency(Math.abs(row.original.totalAmount), "usd")}`
                        : formatCurrency(row.original.totalAmount, "usd")}
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
                  const { status, totalAmount } = row.original;
                  const isRefund = totalAmount < 0;
                  const label = isRefund ? "refunded" : status;
                  const variant = isRefund
                    ? "secondary"
                    : status === "paid"
                      ? "default"
                      : status === "refunded" || status === "partially_refunded"
                        ? "secondary"
                        : status === "void"
                          ? "destructive"
                          : "secondary";
                  return <Badge variant={variant}>{label}</Badge>;
                },
              },
            ]}
            data={filteredOrders}
          />
        )}
      </div>

      {/* Products */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Products</h2>
        {getProducts.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : (getProducts.data?.filter((p) => !p.isArchived).length ?? 0) ===
          0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
            <p className="text-muted-foreground text-sm">No products found</p>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                id: "name",
                header: "Product",
                cell: ({ row }) => (
                  <span className="text-sm font-medium">
                    {row.original.name}
                  </span>
                ),
              },
              {
                id: "price",
                header: "Price",
                cell: ({ row }) => (
                  <span className="text-sm">
                    {formatCurrency(
                      row.original.priceAmount,
                      row.original.priceCurrency
                    )}
                  </span>
                ),
              },
              {
                id: "type",
                header: "Type",
                cell: ({ row }) => (
                  <Badge variant="secondary">
                    {row.original.isRecurring ? "Recurring" : "One-time"}
                  </Badge>
                ),
              },
              {
                id: "interval",
                header: "Interval",
                cell: ({ row }) => (
                  <span className="text-sm capitalize">
                    {row.original.recurringInterval ?? "—"}
                  </span>
                ),
              },
            ]}
            data={getProducts.data?.filter((p) => !p.isArchived) ?? []}
          />
        )}
      </div>
    </div>
  );
}
