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
            <CardAgency.DetailRow label="Product ID">
              <span className="font-mono text-xs">{sub.productId}</span>
            </CardAgency.DetailRow>
            <CardAgency.DetailRow label="User ID">
              <span className="font-mono text-xs">{sub.userId}</span>
            </CardAgency.DetailRow>
            <CardAgency.DetailRow label="Email" value={sub.email} />

            {/* ── Billing ── */}
            <CardAgency.DetailRow label="Amount">
              <span className="text-xl font-bold tabular-nums">
                ${formatPrice(sub.amount)}{" "}
                <span className="text-muted-foreground text-sm font-normal">
                  {sub.currency?.toUpperCase()}
                </span>
              </span>
            </CardAgency.DetailRow>
            <CardAgency.DetailRow
              label="Billing Interval"
              value={sub.recurringInterval ?? "One-time"}
            />
            <CardAgency.DetailRow
              label="Cancel at Period End"
              value={sub.cancelAtPeriodEnd ? "Yes" : "No"}
            />

            {/* ── Dates ── */}
            <CardAgency.DetailRow
              label="Started"
              value={formatDate(sub.startedAt)}
            />
            <CardAgency.DetailRow
              label="Created"
              value={formatDate(sub.createdAt)}
            />
            <CardAgency.DetailRow
              label="Updated"
              value={formatDate(sub.updatedAt)}
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

            {/* ── Cancellation ── */}
            <CardAgency.DetailRow
              label="Cancellation Reason"
              value={sub.customerCancellationReason ?? "—"}
            />
            <CardAgency.DetailRow
              label="Cancellation Comment"
              value={sub.customerCancellationComment ?? "—"}
            />

            {/* ── Services ── */}
            <CardAgency.DetailRow label="Services">
              {sub.services.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {sub.services.map((service) => (
                    <Badge key={service.name} variant="outline">
                      {service.name} — ${formatPrice(service.price)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </CardAgency.DetailRow>

            {/* ── Project ── */}
            <CardAgency.DetailRow label="Project" value={sub.project ?? "—"} />

            {/* ── Extra metadata ── */}
            {(() => {
              const meta = sub.metadata as Record<string, unknown> | undefined;
              if (!meta) return null;
              const knownKeys = new Set([
                "services",
                "project",
                "userId",
                "email",
              ]);
              return Object.entries(meta)
                .filter(([k]) => !knownKeys.has(k))
                .map(([key, value]) => (
                  <CardAgency.DetailRow
                    key={key}
                    label={key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (s) => s.toUpperCase())}
                    value={String(value)}
                  />
                ));
            })()}
          </div>

          {/* ── Services breakdown ── */}
          {sub.services.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="text-muted-foreground mb-3 text-sm font-medium">
                Services Breakdown
              </p>
              <div className="grid grid-cols-2 gap-3">
                {sub.services.map((service) => (
                  <div
                    key={service.name}
                    className="bg-background flex flex-col gap-1 rounded-2xl border p-4"
                  >
                    <p className="text-base font-semibold">{service.name}</p>
                    <p className="text-muted-foreground text-sm tabular-nums">
                      ${formatPrice(service.price)}
                      <span className="text-xs"> /mo</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <p className="text-muted-foreground text-sm font-medium">
                  Total
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  ${formatPrice(sub.services.reduce((s, v) => s + v.price, 0))}
                  <span className="text-muted-foreground text-sm font-normal">
                    {" "}
                    /mo
                  </span>
                </p>
              </div>
            </div>
          )}
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
