"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { DataTable } from "@workspace/ui/custom/data-table";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

// ─── Types ──────────────────────────────────────────────────────

type StripeSubscription = {
  id: string;
  status: string;
  productName: string | null;
  amount: number;
  currency: string;
  interval: string | null;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  canceledAt: number | null;
  trialEnd: number | null;
  created: number;
};

// ─── Helpers ────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500",
  trialing: "bg-blue-500",
  past_due: "bg-amber-500",
  canceled: "bg-red-500",
  unpaid: "bg-orange-500",
  incomplete: "bg-yellow-500",
  incomplete_expired: "bg-gray-400",
};

const INVOICE_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  paid: "default",
  open: "secondary",
  void: "destructive",
  uncollectible: "destructive",
  draft: "secondary",
};

const formatCurrency = (amount: number, currency: string = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

// ─── StatusDot ──────────────────────────────────────────────────

function StatusDot({
  status,
  isCanceling,
}: {
  status: string;
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

function SubscriptionDetailsPanel({ sub }: { sub: StripeSubscription }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground text-xs">Status</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <StatusDot
              status={sub.status}
              isCanceling={sub.cancelAtPeriodEnd || !!sub.canceledAt}
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
            variant={sub.cancelAtPeriodEnd ? "destructive" : "default"}
            className="mt-0.5"
          >
            {sub.cancelAtPeriodEnd ? "Off" : "On"}
          </Badge>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Subscription ID</p>
          <span className="text-muted-foreground block truncate font-mono text-xs">
            {sub.id}
          </span>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Billing Interval</p>
          <span className="capitalize">{sub.interval ?? "—"}</span>
        </div>
        {sub.canceledAt && (
          <div>
            <p className="text-muted-foreground text-xs">Canceled At</p>
            <span>
              {format(new Date(sub.canceledAt * 1000), "MMM d, yyyy")}
            </span>
          </div>
        )}
        {sub.trialEnd && (
          <div>
            <p className="text-muted-foreground text-xs">Trial Ends</p>
            <span>
              {format(new Date(sub.trialEnd * 1000), "MMM d, yyyy")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function AgencyPage() {
  const trpc = useTRPC();
  const { data: currentUser } = useCurrentUser();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: subsData, isPending: subsLoading } = useQuery(
    trpc.payments.getStripeSubscriptions.queryOptions(undefined, {
      enabled: !!currentUser,
    })
  );

  const { data: invoicesData, isPending: invoicesLoading } = useQuery(
    trpc.payments.getStripeInvoices.queryOptions(undefined, {
      enabled: !!currentUser,
    })
  );

  const portalMutation = useMutation(
    trpc.payments.createStripePortalSession.mutationOptions()
  );

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const hasCustomer = subsData?.hasCustomer ?? false;

  // No Stripe customer — show contact UI
  if (!subsLoading && !invoicesLoading && !hasCustomer) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Agency</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">No account found</h2>
            <p className="text-muted-foreground text-sm">
              You don&apos;t have an active agency account yet. Contact us to
              get set up with a subscription plan.
            </p>
            <RequestDialog>
              <Button size="lg">Contact Support</Button>
            </RequestDialog>
          </div>
        </div>
        <LegalFooter />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agency</h1>
        <Button
          variant="outline"
          size="icon"
          disabled={portalMutation.isPending}
          onClick={() =>
            portalMutation.mutate(
              { returnUrl: window.location.href },
              {
                onSuccess: (data) => {
                  if (data.url) window.open(data.url, "_blank");
                },
                onError: (error) => {
                  toast.error(error.message);
                },
              }
            )
          }
        >
          {portalMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CreditCard className="size-4" />
          )}
        </Button>
      </div>

      {/* Subscriptions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Subscriptions</h2>
        {subsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : (subsData?.subscriptions.length ?? 0) === 0 ? (
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
                  const isCanceling =
                    row.original.cancelAtPeriodEnd || !!row.original.canceledAt;
                  return (
                    <div className="flex items-center gap-2.5">
                      <StatusDot
                        status={row.original.status}
                        isCanceling={isCanceling}
                      />
                      <span className="max-w-[140px] truncate font-medium">
                        {row.original.productName || "—"}
                      </span>
                    </div>
                  );
                },
              },
              {
                id: "price",
                header: "Price",
                cell: ({ row }) => (
                  <span className="text-sm">
                    {formatCurrency(row.original.amount, row.original.currency)}
                    <span className="text-muted-foreground ml-1 text-xs uppercase">
                      {row.original.currency}
                    </span>
                  </span>
                ),
              },
              {
                id: "interval",
                header: "Interval",
                cell: ({ row }) => (
                  <span className="capitalize">
                    {row.original.interval ?? "—"}
                  </span>
                ),
              },
              {
                id: "period_end",
                header: "Next Billing",
                cell: ({ row }) => {
                  const end = row.original.currentPeriodEnd;
                  const date = new Date(end * 1000);
                  return (
                    <span className="flex flex-col">
                      <span className="text-sm">
                        {format(date, "MMM dd, yyyy")}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(date, { addSuffix: true })}
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
            data={subsData?.subscriptions ?? []}
            expandedRows={expandedRows}
            renderExpandedRow={(row) => (
              <SubscriptionDetailsPanel sub={row.original} />
            )}
          />
        )}
      </div>

      {/* Invoices */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Invoices</h2>
        {invoicesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : (invoicesData?.invoices.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
            <p className="text-muted-foreground text-sm">No invoices found</p>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                id: "number",
                header: "Invoice",
                cell: ({ row }) => (
                  <span className="font-mono text-sm">
                    {row.original.number || "—"}
                  </span>
                ),
              },
              {
                id: "amount",
                header: "Amount",
                cell: ({ row }) => (
                  <span className="text-sm">
                    {formatCurrency(
                      row.original.amountPaid,
                      row.original.currency
                    )}
                  </span>
                ),
              },
              {
                id: "status",
                header: "Status",
                cell: ({ row }) => {
                  const status = row.original.status ?? "draft";
                  return (
                    <Badge variant={INVOICE_STATUS_VARIANT[status] ?? "secondary"}>
                      {status}
                    </Badge>
                  );
                },
              },
              {
                id: "date",
                header: "Date",
                cell: ({ row }) =>
                  format(new Date(row.original.created * 1000), "MMM d, yyyy"),
              },
              {
                id: "actions",
                header: "",
                cell: ({ row }) => {
                  const { hostedInvoiceUrl, invoicePdf } = row.original;
                  return (
                    <div className="flex justify-end gap-1">
                      {hostedInvoiceUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        </Button>
                      )}
                      {invoicePdf && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="size-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={invoicesData?.invoices ?? []}
          />
        )}
      </div>

      <LegalFooter />
    </div>
  );
}

// ─── Legal Footer ───────────────────────────────────────────────

function LegalFooter() {
  return (
    <div className="border-border/50 mt-4 space-y-4 border-t pt-8">
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        <span className="font-bold">AliSamadii.LLC</span> is a software
        development and digital services company based in Portland, OR. All
        plans are fully managed — we handle your website, hosting, domain, and
        email end-to-end so you never have to deal with technical
        infrastructure.
      </p>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        <span className="font-bold">Please note.</span> This is a fully
        managed service subscription. The source code, underlying codebase,
        and all proprietary development assets remain the exclusive
        intellectual property of AliSamadii.LLC. This subscription does not
        include ownership, transfer, or distribution of source code. The
        client is subscribing to a continuous, professionally managed web
        presence — not a one-time deliverable. Our team handles all technical
        aspects so you can focus entirely on running your business without
        worrying about hosting, code, or infrastructure. If you are interested
        in a custom-built website with full source code ownership, please{" "}
        <a
          href="mailto:agency@alisamadii.com"
          className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          reach out
        </a>{" "}
        to discuss a separate development project tailored to your needs.
      </p>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        <span className="font-bold">Ownership & IP.</span> All source code,
        design assets, and proprietary development work remain the exclusive
        intellectual property of AliSamadii.LLC. Subscribing gives you a
        professionally managed web presence — not ownership of the underlying
        codebase. If you need full source code ownership, contact us to
        discuss a custom development project.
      </p>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        <span className="font-bold">Billing.</span> Subscriptions are billed
        monthly and renew automatically. You can cancel at any time —
        cancellation takes effect at the end of the current billing period. No
        refunds are issued for partial months.
      </p>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        <span className="font-bold">Service & support.</span> All maintenance,
        updates, and minor copy changes are included. Requests are handled on
        a priority basis depending on your plan. For urgent issues or
        questions, reach us at{" "}
        <a
          href="mailto:agency@alisamadii.com"
          className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          agency@alisamadii.com
        </a>
        .
      </p>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        <span className="font-bold">Privacy.</span> We collect only the
        information necessary to provide your services — name, email, billing
        details, and business information you share with us. We do not sell or
        share your data with third parties. All credentials and access
        information are stored securely and made available to you upon
        request.
      </p>
      <p className="text-muted-foreground text-[11px]">
        By subscribing, you agree to these terms. For questions, contact{" "}
        <a
          href="mailto:agency@alisamadii.com"
          className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          agency@alisamadii.com
        </a>
        .
      </p>
    </div>
  );
}
