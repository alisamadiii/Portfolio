import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

// ─── Status colors ───────────────────────────────────────────────
const statusStyle: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  trialing:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  cancelled:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  revoked:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  incomplete:
    "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700",
};

const getStatusStyle = (status: string) =>
  statusStyle[status] ?? statusStyle.incomplete!;

// ─── Copyable ID ─────────────────────────────────────────────────
const CopyId = ({ id }: { id: string }) => (
  <button
    type="button"
    className="hover:text-foreground inline-flex items-center gap-1 font-mono text-xs transition-colors"
    onClick={(e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(id);
      toast.success("Copied ID");
    }}
  >
    {id.slice(0, 8)}…
    <Copy className="size-3" />
  </button>
);

const JsonViewer = ({ data, label }: { data: unknown; label: string }) => {
  const json = JSON.stringify(data, null, 2);

  const highlighted = json.replace(
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")\s*:|("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")|(true|false)|(null)|(-?\d+\.?\d*)/g,
    (
      match,
      key: string,
      string: string,
      bool: string,
      nil: string,
      num: string
    ) => {
      if (key) {
        return `<span class="text-violet-600 dark:text-violet-400">${key}</span>:`;
      }
      if (string) {
        return `<span class="text-emerald-600 dark:text-emerald-400">${string}</span>`;
      }
      if (bool) {
        return `<span class="text-amber-600 dark:text-amber-400">${bool}</span>`;
      }
      if (nil) {
        return `<span class="text-zinc-400 dark:text-zinc-500 italic">${nil}</span>`;
      }
      if (num) {
        return `<span class="text-sky-600 dark:text-sky-400">${num}</span>`;
      }
      return match;
    }
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
          <Code className="size-3" />
          JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2 z-10 h-7 gap-1.5 text-xs"
            onClick={() => {
              navigator.clipboard.writeText(json);
              toast.success("JSON copied");
            }}
          >
            <Copy className="size-3" />
            Copy
          </Button>
          <pre
            className="bg-muted max-h-[60vh] overflow-auto rounded-lg p-4 text-[13px] leading-relaxed break-all whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Component ──────────────────────────────────────────────
export const AgencyProducts = () => {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.admin.agency.products.getAllProducts.queryOptions()
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-20">
        <Package className="size-8 opacity-40" />
        <p className="text-sm">No products found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((product) => {
        const isExpanded = expandedIds.has(product.id);
        const metadata = product.metadata as { email?: string } | undefined;

        return (
          <div
            key={product.id}
            className={cn(
              "rounded-xl outline-1 transition-shadow",
              isExpanded && "shadow-sm",
              metadata?.email && "outline-4 outline-[#00B894]",
              product.name.toLowerCase().includes("motion") &&
                "outline-4 outline-[#2b7fff]"
            )}
          >
            {/* Product Header */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleExpand(product.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleExpand(product.id);
                }
              }}
              className={cn(
                "hover:bg-muted/40 flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors select-none",
                isExpanded && "border-b"
              )}
            >
              {/* Chevron */}
              <div className="text-muted-foreground shrink-0">
                {isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </div>

              {/* Info grid */}
              <div className="grid flex-1 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold">{product.name}</p>
                    <CopyId id={product.id} />
                  </div>

                  {metadata?.email && (
                    <span className="text-muted-foreground hidden text-xs sm:inline">
                      {metadata.email}
                    </span>
                  )}
                </div>

                {/* Right side stats */}
                <div className="flex items-center gap-5">
                  {product.description && (
                    <span
                      className="text-muted-foreground hidden max-w-[200px] truncate text-xs lg:inline"
                      title={product.description}
                    >
                      {product.description}
                    </span>
                  )}

                  <span className="text-sm font-semibold tabular-nums">
                    ${(product.priceAmount / 100).toFixed(2)}
                  </span>

                  <Badge
                    variant="outline"
                    className="text-muted-foreground text-[11px]"
                  >
                    {product.recurringInterval ?? "One-time"}
                  </Badge>

                  <span className="text-muted-foreground hidden text-xs whitespace-nowrap sm:inline">
                    {format(product.createdAt, "MMM d, yyyy")}
                  </span>

                  {/* Actions (stop propagation so they don't toggle) */}
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <JsonViewer
                      data={product}
                      label={`${product.name} — Raw JSON`}
                    />
                    <CreateCheckoutLink productId={product.id} />
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && <ProductOrders productId={product.id} />}
          </div>
        );
      })}
    </div>
  );
};

// ─── Checkout Link ───────────────────────────────────────────────
const CreateCheckoutLink = ({ productId }: { productId: string }) => {
  const trpc = useTRPC();
  const createCheckout = useMutation(
    trpc.admin.agency.products.createCheckout.mutationOptions()
  );

  return (
    <Button
      size="sm"
      className="h-7 text-xs"
      onClick={(e) => {
        e.stopPropagation();
        createCheckout.mutate(
          { productId },
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
      disabled={createCheckout.isPending}
    >
      {createCheckout.isPending && (
        <Loader2 className="mr-1 size-3 animate-spin" />
      )}
      Checkout Link
    </Button>
  );
};

// ─── Orders Panel ────────────────────────────────────────────────
const ProductOrders = ({ productId }: { productId: string }) => {
  const trpc = useTRPC();

  const { data: orders, isLoading } = useQuery(
    trpc.admin.agency.products.getOrdersByProduct.queryOptions(productId, {
      enabled: !!productId,
    })
  );

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-10">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const hasSubscriptions = orders?.subscriptions?.length;
  const hasOrders = orders?.orders?.length;

  if (!hasSubscriptions && !hasOrders) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No orders or subscriptions yet
      </p>
    );
  }

  return (
    <div className="space-y-6 px-5 py-4">
      {/* Subscriptions */}
      {hasSubscriptions ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Subscriptions ({orders.subscriptions.length})
            </h4>
            <JsonViewer
              data={orders.subscriptions}
              label="Subscriptions — Raw JSON"
            />
          </div>

          <div className="divide-y overflow-hidden rounded-lg border">
            {orders.subscriptions.map((sub) => (
              <div
                key={sub.id}
                className={cn(
                  "flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3",
                  (sub.status === "canceled" || sub.cancelAtPeriodEnd) &&
                    "bg-red-500 text-white"
                )}
              >
                <CopyId id={sub.id} />

                <span className="text-sm">{sub.email || "—"}</span>

                <Badge
                  variant="outline"
                  className={cn("text-[11px]", getStatusStyle(sub.status))}
                >
                  {sub.status}
                </Badge>

                <span className="text-sm font-medium tabular-nums">
                  ${(sub.amount / 100).toFixed(2)}
                </span>

                <span className="text-xs">
                  {format(sub.createdAt || new Date(), "MMM d, yyyy")}
                  <span className="mx-1">·</span>
                  {formatDistanceToNow(sub.createdAt || new Date(), {
                    addSuffix: true,
                  })}
                </span>

                {sub.cancelAtPeriodEnd && (
                  <Badge
                    variant="outline"
                    className={cn("text-[11px]", getStatusStyle("cancelled"))}
                  >
                    Cancels{" "}
                    {format(sub.canceledAt || new Date(), "MMM d, yyyy")}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Orders */}
      {hasOrders ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Orders ({orders.orders.length})
            </h4>
            <JsonViewer data={orders.orders} label="Orders — Raw JSON" />
          </div>

          <div className="divide-y rounded-lg border">
            {orders.orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
              >
                <CopyId id={order.id} />

                <div className="min-w-[120px]">
                  <p className="text-sm">{order.billingName || "—"}</p>
                  <p className="text-muted-foreground text-xs">
                    {order.email || "—"}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={cn("text-[11px]", getStatusStyle(order.status))}
                >
                  {order.status}
                </Badge>

                <span className="text-sm font-medium tabular-nums">
                  ${(order.totalAmount / 100).toFixed(2)}
                </span>

                <span className="text-muted-foreground text-xs">
                  {format(order.createdAt || new Date(), "MMM d, yyyy")}
                  <span className="mx-1">·</span>
                  {formatDistanceToNow(order.createdAt || new Date(), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};
