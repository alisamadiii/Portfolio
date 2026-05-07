"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Code, ExternalLink, Loader2, Receipt } from "lucide-react";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { ClientMediaGallery } from "@/components/clients/client-media-gallery";
import { ClientMetadataEditor } from "@/components/clients/client-metadata-editor";
import { ShowJSONDialog } from "@/components/show-json-dialog";

// ─── Helpers ────────────────���─────────────────────────────────────
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
};

function LivePlanItems({ subscriptionId }: { subscriptionId: string }) {
  const trpc = useTRPC();
  const { data, isLoading, error } = useQuery(
    trpc.billing.adminGetSubscriptionDetails.queryOptions(
      { subscriptionId },
      { enabled: !!subscriptionId }
    )
  );

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading plan items...
      </div>
    );
  }

  if (error && !data) return null;

  return (
    <>
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
        <div className="space-y-2 border-t pt-4">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Plan Items (Live from Stripe)
          </p>
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
        </div>
      )}
    </>
  );
}

function ClientOrders({ userId }: { userId: string }) {
  const trpc = useTRPC();
  const { data: orders, isLoading } = useQuery(
    trpc.billing.adminListOrders.queryOptions(
      { userId },
      { enabled: !!userId }
    )
  );

  if (isLoading) {
    return (
      <CardAgency.Card>
        <CardAgency.Header title="Orders & Purchases" />
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading orders...
        </div>
      </CardAgency.Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <CardAgency.Card>
        <CardAgency.Header title="Orders & Purchases" />
        <p className="text-muted-foreground text-sm">No orders found.</p>
      </CardAgency.Card>
    );
  }

  return (
    <CardAgency.Card>
      <CardAgency.Header title="Orders & Purchases">
        <Badge variant="secondary">{orders.length}</Badge>
      </CardAgency.Header>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">
                  {order.productName ?? (
                    <span className="text-muted-foreground font-mono text-xs">
                      {order.id.slice(0, 16)}...
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-medium tabular-nums">
                  ${(order.amount / 100).toFixed(2)}{" "}
                  <span className="text-muted-foreground uppercase">
                    {order.currency}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant={
                      order.status === "paid" ? "default" : "destructive"
                    }
                    className="text-[10px]"
                  >
                    {order.status}
                  </Badge>
                </td>
                <td className="text-muted-foreground px-3 py-2 text-xs">
                  {order.type === "one_time" ? "One-time" : "Subscription"}
                </td>
                <td className="text-muted-foreground px-3 py-2 text-xs">
                  {order.createdAt
                    ? format(new Date(order.createdAt), "MMM d, yyyy")
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  {order.receiptUrl && (
                    <a
                      href={order.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardAgency.Card>
  );
}

// ─── Page ───────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.users.getClientDetail.queryOptions(id, { enabled: !!id })
  );

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const { user, subscriptions } = data;

  const userMetadata = (user.metadata as Record<string, string> | null) ?? {};

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 p-4 md:p-8">
      {/* Back */}
      <Button variant="ghost" size="sm" className="gap-1.5" asChild>
        <Link href="/clients">
          <ArrowLeft className="size-4" />
          Back to Clients
        </Link>
      </Button>

      {/* ── Subscriptions ─────────────────────────────────────────── */}
      {subscriptions.map((sub) => (
        <CardAgency.Card key={sub.id}>
          <CardAgency.Header title="Subscription">
            <div className="flex items-center gap-2">
              <Badge
                variant={sub.status === "active" ? "default" : "destructive"}
              >
                {sub.status}
              </Badge>
              <ShowJSONDialog data={sub} title="Subscription JSON">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                >
                  <Code className="size-3" />
                  JSON
                </Button>
              </ShowJSONDialog>
            </div>
          </CardAgency.Header>

          <div className="grid gap-4">
            {/* ── Identity ── */}
            <CardAgency.DetailRow label="Subscription ID">
              <span className="font-mono text-xs">{sub.id}</span>
            </CardAgency.DetailRow>
            <CardAgency.DetailRow label="Plan">
              <span className="font-mono text-xs">{sub.plan}</span>
            </CardAgency.DetailRow>
            <CardAgency.DetailRow label="User ID">
              <span className="font-mono text-xs">{sub.referenceId}</span>
            </CardAgency.DetailRow>

            {/* ── Billing ── */}
            <CardAgency.DetailRow label="Amount">
              <span className="text-xl font-bold tabular-nums">
                ${formatPrice(sub.totalAmount)}{" "}
                <span className="text-muted-foreground text-sm font-normal">
                  {sub.currency?.toUpperCase()}
                </span>
              </span>
            </CardAgency.DetailRow>
            <CardAgency.DetailRow
              label="Billing Interval"
              value={sub.billingInterval ?? "One-time"}
            />
            <CardAgency.DetailRow
              label="Cancel at Period End"
              value={sub.cancelAtPeriodEnd ? "Yes" : "No"}
            />

            {/* ── Dates ── */}
            <CardAgency.DetailRow
              label="Period Start"
              value={formatDate(sub.periodStart)}
            />
            <CardAgency.DetailRow
              label="Period End"
              value={formatDate(sub.periodEnd)}
            />
            <CardAgency.DetailRow
              label="Trial Start"
              value={formatDate(sub.trialStart)}
            />
            <CardAgency.DetailRow
              label="Trial End"
              value={formatDate(sub.trialEnd)}
            />
            <CardAgency.DetailRow
              label="Canceled At"
              value={formatDate(sub.canceledAt)}
            />

            {/* ── Stripe ── */}
            <CardAgency.DetailRow label="Stripe Subscription ID">
              <span className="font-mono text-xs">
                {sub.stripeSubscriptionId ?? "—"}
              </span>
            </CardAgency.DetailRow>
          </div>

          {sub.stripeSubscriptionId && (
            <LivePlanItems subscriptionId={sub.stripeSubscriptionId} />
          )}
        </CardAgency.Card>
      ))}

      {/* ── Orders & Purchases ─────────────────────────────────── */}
      <ClientOrders userId={id} />

      {/* ── Client Info ───────────────────────────────────────────── */}
      <CardAgency.Card>
        <CardAgency.Header title="Client Details">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/users/${id}?tab=notifications`}>Notifications</Link>
          </Button>
        </CardAgency.Header>
        <div className="grid gap-5">
          <CardAgency.DetailRow label="Name" value={user.name ?? ""} />
          <CardAgency.DetailRow label="Email" value={user.email ?? ""} />
          <CardAgency.DetailRow label="Phone" value={user.phone ?? ""} />
          <CardAgency.DetailRow label="Company" value={user.company ?? ""} />
          <CardAgency.DetailRow label="Address" value={user.address ?? ""} />
          <CardAgency.DetailRow
            label="Joined"
            value={format(new Date(user.createdAt), "MMMM d, yyyy")}
          />
        </div>
      </CardAgency.Card>

      {/* ── Media & Files ────────────────────────────────────────── */}
      <ClientMediaGallery userId={id} />

      {/* ── Custom Fields ─────────────────────────────────────────── */}
      <ClientMetadataEditor userId={id} initialMetadata={userMetadata} />
    </div>
  );
}
