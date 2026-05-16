"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
  Pencil,
  X,
} from "lucide-react";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { ClientContactSubmissions } from "@/components/clients/client-contact-submissions";
import { ClientScopes } from "@/components/clients/client-scopes";
import { ClientMediaGallery } from "@/components/clients/client-media-gallery";
import { ClientMetadataEditor } from "@/components/clients/client-metadata-editor";

// ─── Stripe Customer ID ─────────────────────────────────────────

const StripeCustomerIdField = ({
  userId,
  value,
}: {
  userId: string;
  value: string | null;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const update = useMutation(
    trpc.users.adminUpdate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        setEditing(false);
      },
    })
  );

  if (editing) {
    return (
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium">
            Stripe Customer ID
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="cus_..."
              className="h-8 font-mono text-sm"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  id: userId,
                  stripeCustomerId: draft || null,
                })
              }
            >
              {update.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => {
                setDraft(value ?? "");
                setEditing(false);
              }}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium">
          Stripe Customer ID
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate font-mono text-sm">
            {value || <span className="text-muted-foreground">Not set</span>}
          </p>
          <button
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Stripe Subscriptions ───────────────────────────────────────

const StripeSubscriptions = ({
  stripeCustomerId,
}: {
  stripeCustomerId: string;
}) => {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.payments.adminGetStripeSubscriptions.queryOptions({
      stripeCustomerId,
    })
  );

  if (isLoading) {
    return (
      <CardAgency.Card>
        <CardAgency.Header title="Stripe Subscriptions" />
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading subscriptions...
        </div>
      </CardAgency.Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <CardAgency.Card>
        <CardAgency.Header title="Stripe Subscriptions" />
        <p className="text-muted-foreground text-sm">No subscriptions found.</p>
      </CardAgency.Card>
    );
  }

  return (
    <CardAgency.Card>
      <CardAgency.Header title="Stripe Subscriptions">
        <Badge variant="secondary">{data.length}</Badge>
      </CardAgency.Header>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Interval</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((sub) => (
              <tr key={sub.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">
                  {sub.productName ?? (
                    <span className="text-muted-foreground font-mono text-xs">
                      {sub.id.slice(0, 16)}...
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-medium tabular-nums">
                  ${formatPrice(sub.amount)}{" "}
                  <span className="text-muted-foreground uppercase">
                    {sub.currency}
                  </span>
                </td>
                <td className="px-3 py-2 capitalize">
                  {sub.interval ?? "One-time"}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant={
                      sub.status === "active" || sub.status === "trialing"
                        ? "default"
                        : "destructive"
                    }
                    className="text-[10px]"
                  >
                    {sub.cancelAtPeriodEnd && sub.status === "active"
                      ? "canceling"
                      : sub.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardAgency.Card>
  );
};

// ─── Stripe Invoices ────────────────────────────────────────────

const StripeInvoices = ({
  stripeCustomerId,
}: {
  stripeCustomerId: string;
}) => {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.payments.adminGetStripeInvoices.queryOptions({ stripeCustomerId })
  );

  if (isLoading) {
    return (
      <CardAgency.Card>
        <CardAgency.Header title="Invoices" />
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading invoices...
        </div>
      </CardAgency.Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <CardAgency.Card>
        <CardAgency.Header title="Invoices" />
        <p className="text-muted-foreground text-sm">No invoices found.</p>
      </CardAgency.Card>
    );
  }

  return (
    <CardAgency.Card>
      <CardAgency.Header title="Invoices">
        <Badge variant="secondary">{data.length}</Badge>
      </CardAgency.Header>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="px-3 py-2 font-medium">Invoice</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {data.map((inv) => (
              <tr key={inv.id} className="border-b last:border-b-0">
                <td className="px-3 py-2 font-mono text-xs">
                  {inv.number ?? inv.id.slice(0, 16)}
                </td>
                <td className="px-3 py-2 font-medium tabular-nums">
                  ${formatPrice(inv.amountPaid)}{" "}
                  <span className="text-muted-foreground uppercase">
                    {inv.currency}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant={inv.status === "paid" ? "default" : "destructive"}
                    className="text-[10px]"
                  >
                    {inv.status}
                  </Badge>
                </td>
                <td className="text-muted-foreground px-3 py-2 text-xs">
                  {format(new Date(inv.created * 1000), "MMM d, yyyy")}
                </td>
                <td className="px-3 py-2">
                  {inv.invoicePdf && (
                    <a
                      href={inv.invoicePdf}
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
};

// ─── Page ───────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.clients.get.queryOptions(id, { enabled: !!id })
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

  const { user, client, scopes, contactSubmissions } = data;
  const userMetadata = (user.metadata as Record<string, string> | null) ?? {};

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 p-4 md:p-8">
      {/* Back */}
      <Button variant="ghost" size="sm" className="gap-1.5" render={<Link href="/clients" />}>
          <ArrowLeft className="size-4" />
          Back to Clients
      </Button>

      {/* ── Client Info ──────────────────────────────────────────── */}
      <CardAgency.Card>
        <CardAgency.Header title="Client Details">
          <Button variant="outline" size="sm" render={<Link href={`/users/${user.id}?tab=notifications`} />}>
              Notifications
          </Button>
        </CardAgency.Header>
        <div className="grid gap-5">
          <CardAgency.DetailRow label="Name" value={user.name ?? ""} />
          <CardAgency.DetailRow label="Email" value={user.email ?? ""} />
          <CardAgency.DetailRow label="Phone" value={user.phone ?? ""} />
          <CardAgency.DetailRow label="Company" value={user.company ?? ""} />
          <CardAgency.DetailRow label="Address" value={user.address ?? ""} />
          <StripeCustomerIdField
            userId={user.id}
            value={user.stripeCustomerId ?? null}
          />
          <CardAgency.DetailRow
            label="Joined"
            value={format(new Date(user.createdAt), "MMMM d, yyyy")}
          />
        </div>
      </CardAgency.Card>

      {/* ── Stripe Subscriptions ─────────────────────────────────── */}
      {user.stripeCustomerId && (
        <StripeSubscriptions stripeCustomerId={user.stripeCustomerId} />
      )}

      {/* ── Stripe Invoices ──────────────────────────────────────── */}
      {user.stripeCustomerId && (
        <StripeInvoices stripeCustomerId={user.stripeCustomerId} />
      )}

      {/* ── Domains ──────────────────────────────────────────────── */}
      <ClientScopes
        clientId={client.id}
        userEmail={user.email}
      />

      {/* ── Contact Submissions ──────────────────────────────────── */}
      <ClientContactSubmissions
        submissions={contactSubmissions}
        isLoading={false}
      />

      {/* ── Media & Files ────────────────────────────────────────── */}
      <ClientMediaGallery userId={user.id} />

      {/* ── Custom Fields ─────────────────────────────────────────── */}
      <ClientMetadataEditor userId={user.id} clientId={client.id} initialMetadata={userMetadata} />
    </div>
  );
}
