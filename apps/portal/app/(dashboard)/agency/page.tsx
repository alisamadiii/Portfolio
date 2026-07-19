"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { DataTable } from "@workspace/ui/custom/data-table";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

// ─── Types ──────────────────────────────────────────────────────

type StripeSubscription =
  RouterOutputs["payments"]["getStripeSubscriptions"][number];
type StripeInvoice = RouterOutputs["payments"]["getStripeInvoices"][number];

// ─── Helpers ────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  active: "bg-status-success-bg text-status-success",
  trialing: "bg-status-info-bg text-status-info",
  past_due: "bg-status-warning-bg text-status-warning",
  canceled: "bg-status-danger-bg text-status-danger",
  unpaid: "bg-status-warning-bg text-status-warning",
  incomplete: "bg-status-warning-bg text-status-warning",
  incomplete_expired: "bg-status-neutral-bg text-status-neutral",
  canceling: "bg-status-warning-bg text-status-warning",
  paid: "bg-status-success-bg text-status-success",
  open: "bg-status-info-bg text-status-info",
  void: "bg-status-danger-bg text-status-danger",
  uncollectible: "bg-status-danger-bg text-status-danger",
  draft: "bg-status-neutral-bg text-status-neutral",
};

const formatCurrency = (amount: number, currency: string = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

// ─── Shared bits ────────────────────────────────────────────────

const StatusPill = ({ status }: { status: string }) => (
  <span
    className={cn(
      "rounded-full px-3 py-1 text-xs font-semibold capitalize",
      STATUS_PILL[status] ?? "bg-status-neutral-bg text-status-neutral"
    )}
  >
    {status.replace(/_/g, " ")}
  </span>
);

const PageHeading = () => (
  <h2 className="text-[27px] font-extrabold tracking-tight">Agency</h2>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="border-rule border-r px-5.5 py-4.5 last:border-r-0">
    <p className="text-muted-foreground text-[11.5px] font-semibold tracking-[0.04em] uppercase">
      {label}
    </p>
    <p className="mt-1 text-[15px] font-bold">{value}</p>
  </div>
);

// ─── Subscription Card ──────────────────────────────────────────

const SubscriptionCard = ({
  sub,
  onManageBilling,
  isManaging,
}: {
  sub: StripeSubscription;
  onManageBilling: () => void;
  isManaging: boolean;
}) => {
  const { data: currentUser } = useCurrentUser();
  const isCanceling = sub.cancelAtPeriodEnd || !!sub.canceledAt;
  const renewal = new Date(sub.currentPeriodEnd * 1000);

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <div className="border-rule flex items-center gap-4 border-b px-5.5 py-5.5">
        <div className="bg-accent text-accent-foreground grid size-12.5 shrink-0 place-items-center rounded-[14px]">
          <Building2 className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[19px] font-extrabold tracking-tight">
            {sub.productName || "Agency"}
          </p>
          <p className="text-muted-foreground text-[13.5px]">
            {currentUser?.user.company || "AliSamadii.LLC"}
            {currentUser?.user.address ? ` · ${currentUser.user.address}` : ""}
          </p>
        </div>
        <StatusPill status={isCanceling ? "canceling" : sub.status} />
        <div className="text-right">
          <p className="text-[22px] font-extrabold tracking-tight">
            {formatCurrency(sub.amount, sub.currency)}
          </p>
          <p className="text-muted-foreground text-[12.5px]">
            per {sub.interval ?? "month"}
          </p>
        </div>
      </div>

      <div className="border-rule grid grid-cols-1 border-b sm:grid-cols-3">
        <Stat label="Next renewal" value={format(renewal, "MMM d, yyyy")} />
        <Stat
          label="Billing interval"
          value={sub.interval ? `${sub.interval}ly` : "—"}
        />
        <Stat label="Auto-renewal" value={isCanceling ? "Off" : "On"} />
      </div>

      <div className="card-band">
        <RequestDialog>
          <Button variant="outline" className="rounded-full px-5">
            Request a change
          </Button>
        </RequestDialog>
        <Button
          className="rounded-full px-5"
          disabled={isManaging}
          isLoading={isManaging}
          onClick={onManageBilling}
        >
          Manage billing
        </Button>
      </div>
    </div>
  );
};

// ─── Invoice Details Panel ──────────────────────────────────────

const InvoiceDetailsPanel = ({ invoice }: { invoice: StripeInvoice }) => (
  <div className="bg-muted/40 space-y-3 px-5.5 py-4.5">
    <p className="text-muted-foreground text-xs font-semibold uppercase">
      Line Items
    </p>
    {invoice.lineItems.length === 0 ? (
      <p className="text-muted-foreground text-sm">No line items</p>
    ) : (
      <div className="space-y-2">
        {invoice.lineItems.map((item) => (
          <div
            key={item.id}
            className="bg-card flex items-center justify-between rounded-[12px] border px-3.5 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {item.description ?? "—"}
              </p>
              {item.quantity && item.quantity > 1 && (
                <p className="text-muted-foreground text-xs">
                  Qty: {item.quantity}
                </p>
              )}
            </div>
            <span className="ml-4 shrink-0 text-sm font-bold tabular-nums">
              {formatCurrency(item.amount, item.currency)}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Page ───────────────────────────────────────────────────────

export default function AgencyPage() {
  const trpc = useTRPC();
  const { data: currentUser } = useCurrentUser();
  const [expandedInvRows, setExpandedInvRows] = useState<Set<string>>(
    new Set()
  );

  const {
    data: subsData,
    isFetching: subsLoading,
    error: subsError,
  } = useQuery(
    trpc.payments.getStripeSubscriptions.queryOptions(undefined, {
      enabled: !!currentUser,
    })
  );

  const {
    data: invoicesData,
    isFetching: invoicesLoading,
    error: invoicesError,
  } = useQuery(
    trpc.payments.getStripeInvoices.queryOptions(undefined, {
      enabled: !!currentUser,
    })
  );

  const portalMutation = useMutation(
    trpc.payments.createStripePortalSession.mutationOptions()
  );

  const openBillingPortal = () =>
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
    );

  const toggleInvRow = (rowId: string) => {
    setExpandedInvRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  if (subsLoading || invoicesLoading) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <Skeleton className="h-56 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (subsError || invoicesError) {
    const error = subsError ?? invoicesError!;
    return (
      <div className="space-y-6">
        <PageHeading />
        <div className="border-destructive/40 bg-destructive/5 rounded-lg border py-14 text-center">
          <div className="mx-auto max-w-sm space-y-2.5">
            <h3 className="text-[22px] font-extrabold tracking-tight">
              Something went wrong
            </h3>
            <p className="text-muted-foreground text-[14.5px]">
              {error.message}
            </p>
            {"data" in error && error.data && (
              <p className="text-destructive font-mono text-xs">
                {(error.data as { code?: string }).code ?? "UNKNOWN_ERROR"}
              </p>
            )}
          </div>
        </div>
        <LegalFooter />
      </div>
    );
  }

  if ((subsData?.length ?? 0) === 0 && (invoicesData?.length ?? 0) === 0) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <div className="rounded-lg border border-dashed px-6 py-14 text-center">
          <h3 className="text-[22px] font-extrabold tracking-tight">
            No account found
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 mb-5.5 max-w-[380px] text-[14.5px]">
            You don&apos;t have an active agency account yet. Contact us to get
            set up with a subscription plan.
          </p>
          <RequestDialog>
            <Button size="lg" className="rounded-full px-6">
              Contact Support
            </Button>
          </RequestDialog>
        </div>
        <LegalFooter />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading />

      {subsData?.map((sub) => (
        <SubscriptionCard
          key={sub.id}
          sub={sub}
          onManageBilling={openBillingPortal}
          isManaging={portalMutation.isPending}
        />
      ))}

      {(invoicesData?.length ?? 0) > 0 && (
        <section className="space-y-4 pt-2">
          <h3 className="text-2xl font-extrabold tracking-tight">Invoices</h3>
          <DataTable
            className="table-card"
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
                  <span className="text-sm font-bold">
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
                cell: ({ row }) => (
                  <StatusPill status={row.original.status ?? "draft"} />
                ),
              },
              {
                id: "date",
                header: "Date",
                cell: ({ row }) => (
                  <span className="text-muted-foreground text-sm">
                    {format(
                      new Date(row.original.created * 1000),
                      "MMM d, yyyy"
                    )}
                  </span>
                ),
              },
              {
                id: "actions",
                header: "",
                cell: ({ row }) => {
                  const { hostedInvoiceUrl, invoicePdf } = row.original;
                  const isExpanded = expandedInvRows.has(row.id);
                  return (
                    <div className="flex justify-end gap-1">
                      {hostedInvoiceUrl && (
                        <Button variant="ghost" size="sm" render={<a
                            href={hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          />}>
                            <ExternalLink className="size-4" />
                        </Button>
                      )}
                      {invoicePdf && (
                        <Button variant="ghost" size="sm" render={<a
                            href={invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                          />}>
                            <FileText className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleInvRow(row.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </Button>
                    </div>
                  );
                },
              },
            ]}
            data={invoicesData ?? []}
            expandedRows={expandedInvRows}
            renderExpandedRow={(row) => (
              <InvoiceDetailsPanel invoice={row.original} />
            )}
          />
        </section>
      )}

      <LegalFooter />
    </div>
  );
}

// ─── Legal Footer ───────────────────────────────────────────────

const LegalFooter = () => (
  <div className="text-secondary-foreground mt-8 max-w-[760px] space-y-3.5 border-t pt-8 text-sm leading-relaxed">
    <p>
      <strong className="text-foreground">AliSamadii.LLC</strong> is a software
      development and digital services company based in Portland, OR. All plans
      are fully managed — we handle your website, hosting, domain, and email
      end-to-end so you never have to deal with technical infrastructure.
    </p>
    <p>
      <strong className="text-foreground">Please note.</strong> This is a fully
      managed service subscription. The source code, underlying codebase, and
      all proprietary development assets remain the exclusive intellectual
      property of AliSamadii.LLC. This subscription does not include ownership,
      transfer, or distribution of source code. The client is subscribing to a
      continuous, professionally managed web presence — not a one-time
      deliverable. If you are interested in a custom-built website with full
      source code ownership, please{" "}
      <a
        href="mailto:agency@alisamadii.com"
        className="hover:text-foreground underline underline-offset-2 transition-colors"
      >
        reach out
      </a>{" "}
      to discuss a separate development project.
    </p>
    <p>
      <strong className="text-foreground">Ownership &amp; IP.</strong> All
      source code, design assets, and proprietary development work remain the
      exclusive intellectual property of AliSamadii.LLC. Subscribing gives you a
      professionally managed web presence — not ownership of the underlying
      codebase.
    </p>
    <p>
      <strong className="text-foreground">Billing.</strong> Subscriptions are
      billed monthly and renew automatically. You can cancel at any time —
      cancellation takes effect at the end of the current billing period. No
      refunds are issued for partial months.
    </p>
    <p>
      <strong className="text-foreground">Service &amp; support.</strong> All
      maintenance, updates, and minor copy changes are included. Requests are
      handled on a priority basis depending on your plan. For urgent issues,
      reach us at{" "}
      <a
        href="mailto:agency@alisamadii.com"
        className="hover:text-foreground underline underline-offset-2 transition-colors"
      >
        agency@alisamadii.com
      </a>
      .
    </p>
    <p>
      <strong className="text-foreground">Privacy.</strong> We collect only the
      information necessary to provide your services — name, email, billing
      details, and business information you share with us. We do not sell or
      share your data with third parties.
    </p>
  </div>
);
