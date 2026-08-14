"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, CreditCard } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { DataTable } from "@workspace/ui/custom/data-table";
import { getProjectColor, projectDesign } from "@workspace/ui/lib/design";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useGeneratePortalLink } from "@workspace/auth/hooks/use-payments";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import {
  EmptyPanel,
  formatCurrency,
  RowSkeleton,
  SectionHeading,
  StatusPill,
} from "@/components/billing/shared";

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

const getOrderMeta = (order: Order): OrderMeta => order.metadata as OrderMeta;

const getOrderProject = (order: Order): string | undefined =>
  getOrderMeta(order)?.project ?? undefined;

const getOrderProductName = (order: Order): string => {
  if (order.productName) return order.productName;
  const meta = getOrderMeta(order);
  if (meta?.name) return meta.name;
  if (meta?.project) return meta.project;
  if (order.billingReason === "subscription") return "Subscription";
  return "Purchase";
};

const getMark = (label: string) => label.trim().charAt(0).toUpperCase() || "•";

// ─── Polar Billing ──────────────────────────────────────────────

export const PolarBilling = () => {
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { data: user } = useCurrentUser();
  const trpc = useTRPC();
  const generatePortalLink = useGeneratePortalLink();

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

  const filteredSubscriptions = useMemo(
    () => subscriptions ?? [],
    [subscriptions]
  );

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  return (
    <div className="space-y-9">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2.5">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4.5 py-2 text-[13.5px] font-semibold transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-secondary-foreground border-border hover:bg-muted"
              )}
            >
              {f.color && (
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor:
                      filter === f.value ? "currentColor" : f.color,
                  }}
                />
              )}
              {f.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          disabled={generatePortalLink.isPending}
          isLoading={generatePortalLink.isPending}
          onClick={() => generatePortalLink.mutate()}
        >
          <CreditCard className="size-4" />
        </Button>
      </div>

      {/* Subscriptions */}
      <section className="space-y-4">
        <SectionHeading>Subscriptions</SectionHeading>
        {subsLoading || getProducts.isPending ? (
          <RowSkeleton />
        ) : filteredSubscriptions.length === 0 ? (
          <EmptyPanel>No subscriptions found</EmptyPanel>
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border">
            {filteredSubscriptions.map((sub, index) => {
              const rowId = sub.id ?? String(index);
              const isExpanded = expandedRows.has(rowId);
              const isCanceling = !!(sub.cancelAtPeriodEnd || sub.canceledAt);
              const name = sub.productName || sub.productId || "—";

              return (
                <div
                  key={rowId}
                  className="border-rule border-b last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleRow(rowId)}
                    className="hover:bg-muted/40 flex w-full items-center gap-4.5 px-5.5 py-4.5 text-left transition-colors"
                  >
                    <span className="bg-primary text-primary-foreground grid size-10.5 shrink-0 place-items-center rounded-[12px] text-base font-bold">
                      {getMark(name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold">
                        {name}
                      </span>
                      <span className="text-muted-foreground block text-[13px]">
                        {sub.startedAt
                          ? `Renews ${formatDistanceToNow(new Date(sub.startedAt), { addSuffix: true })}`
                          : "—"}
                      </span>
                    </span>
                    <StatusPill
                      status={isCanceling ? "canceling" : sub.status}
                    />
                    <span className="min-w-[110px] text-right">
                      <span className="block text-lg font-extrabold tracking-tight">
                        {sub.amount ? formatCurrency(sub.amount) : "—"}
                      </span>
                      <span className="text-muted-foreground block text-[12.5px] capitalize">
                        {sub.recurringInterval ?? "—"}
                      </span>
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="text-muted-foreground size-4 shrink-0" />
                    ) : (
                      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                    )}
                  </button>
                  {isExpanded && <SubscriptionDetailsPanel sub={sub} />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Orders */}
      <section className="space-y-4">
        <SectionHeading>Orders</SectionHeading>
        {ordersLoading ? (
          <RowSkeleton />
        ) : filteredOrders.length === 0 ? (
          <EmptyPanel>No orders found</EmptyPanel>
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border">
            {filteredOrders.map((order) => {
              const name = getOrderProductName(order);
              const isRefund = order.totalAmount < 0;

              return (
                <div
                  key={order.id}
                  className="border-rule flex items-center gap-4.5 border-b px-5.5 py-4.5 last:border-b-0"
                >
                  <span
                    className="grid size-10.5 shrink-0 place-items-center rounded-[12px] text-base font-bold text-white"
                    style={{
                      backgroundColor: getProjectColor(getOrderProject(order)),
                    }}
                  >
                    {getMark(name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold">{name}</p>
                    <p className="text-muted-foreground text-[13px]">
                      {order.createdAt
                        ? format(new Date(order.createdAt), "MMM d, yyyy")
                        : "—"}
                    </p>
                  </div>
                  <span className="bg-status-neutral-bg text-secondary-foreground rounded-full px-3 py-1 text-xs font-semibold capitalize">
                    {isRefund ? "refunded" : order.status}
                  </span>
                  <span
                    className={cn(
                      "min-w-[90px] text-right text-lg font-extrabold tracking-tight",
                      isRefund && "text-destructive"
                    )}
                  >
                    {isRefund
                      ? `-${formatCurrency(Math.abs(order.totalAmount))}`
                      : formatCurrency(order.totalAmount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Products */}
      <section className="space-y-4">
        <SectionHeading>Products</SectionHeading>
        {getProducts.isPending ? (
          <RowSkeleton />
        ) : (getProducts.data?.filter((p) => !p.isArchived).length ?? 0) ===
          0 ? (
          <EmptyPanel>No products found</EmptyPanel>
        ) : (
          <DataTable
            className="table-card"
            columns={[
              {
                id: "name",
                header: "Product",
                cell: ({ row }) => (
                  <span className="text-sm font-bold">{row.original.name}</span>
                ),
              },
              {
                id: "price",
                header: "Price",
                cell: ({ row }) => (
                  <span className="text-sm font-bold">
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
                  <span className="bg-status-neutral-bg text-secondary-foreground rounded-full px-3 py-1 text-xs font-semibold">
                    {row.original.isRecurring ? "Recurring" : "One-time"}
                  </span>
                ),
              },
              {
                id: "interval",
                header: "Interval",
                cell: ({ row }) => (
                  <span className="text-muted-foreground text-sm capitalize">
                    {row.original.recurringInterval ?? "—"}
                  </span>
                ),
              },
            ]}
            data={getProducts.data?.filter((p) => !p.isArchived) ?? []}
          />
        )}
      </section>
    </div>
  );
};

// ─── Subscription Details Panel ─────────────────────────────────

const SubscriptionDetailsPanel = ({ sub }: { sub: Subscription }) => {
  const isCanceling = !!(sub.cancelAtPeriodEnd || sub.canceledAt);

  return (
    <div className="bg-muted/40 border-rule grid grid-cols-2 gap-x-8 gap-y-3 border-t px-5.5 py-4.5 text-sm sm:grid-cols-4">
      <div>
        <p className="text-muted-foreground text-xs">Status</p>
        <p className="mt-0.5 capitalize">
          {isCanceling ? "canceling" : sub.status}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs">Auto-Renewal</p>
        <Badge
          variant={isCanceling ? "destructive" : "default"}
          className="mt-0.5"
        >
          {isCanceling ? "Off" : "On"}
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
  );
};
