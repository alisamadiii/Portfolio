"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Code } from "lucide-react";

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

// ─── Page ────────────────��──────────────────────��──────────────────
export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.admin.agency.clients.getById.queryOptions(id, { enabled: !!id })
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

        </CardAgency.Card>
      ))}

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
