"use client";

import { Fragment, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  TrendingUp,
} from "lucide-react";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn, formatPrice } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

// ─── Stat Card ─────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  icon: Icon,
  iconColor,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  subtitle?: string;
}) => (
  <CardAgency.Card className="p-5">
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <div className={cn("rounded-lg p-2", iconColor)}>
        <Icon className="size-4" />
      </div>
    </div>
    <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
      {value}
    </p>
    {subtitle && (
      <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
    )}
  </CardAgency.Card>
);

// ─── Status Helpers ────────────────────────────────────────────

const subStatusStyle: Record<string, string> = {
  active: "border-l-emerald-500 bg-emerald-500/5",
  trialing: "border-l-blue-500 bg-blue-500/5",
  canceled: "border-l-zinc-400 bg-zinc-400/5",
  incomplete: "border-l-amber-500 bg-amber-500/5",
  past_due: "border-l-red-500 bg-red-500/5",
};

const subBadgeVariant = (status: string) => {
  if (status === "active" || status === "trialing") return "default" as const;
  if (status === "past_due" || status === "incomplete")
    return "destructive" as const;
  return "secondary" as const;
};

const invoiceBadge = (status: string) => {
  if (status === "paid")
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (status === "open" || status === "draft")
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-red-500/10 text-red-600 border-red-500/20";
};

// ─── Billing Overview ──────────────────────────────────────────

export function BillingOverview() {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(
    new Set()
  );

  const { data: user } = useQuery(
    trpc.users.get.queryOptions(id, { enabled: !!id })
  );
  const email = user?.email ?? "";
  // Only clients have Stripe-managed billing — skip the calls otherwise to
  // avoid burning through Stripe rate limits.
  const isClient = !!user?.isClient;

  const { data: subs, isLoading: subsLoading } = useQuery(
    trpc.payments.adminGetStripeSubscriptions.queryOptions(
      { email },
      { enabled: !!email && isClient, staleTime: 5 * 60 * 1000 }
    )
  );

  const { data: invoices, isLoading: invoicesLoading } = useQuery(
    trpc.payments.adminGetStripeInvoices.queryOptions(
      { email },
      { enabled: !!email && isClient, staleTime: 5 * 60 * 1000 }
    )
  );

  const stats = useMemo(() => {
    const paidInvoices = invoices?.filter((i) => i.status === "paid") ?? [];
    const totalPaid = paidInvoices.reduce((sum, i) => sum + i.amountPaid, 0);
    const activeSubs =
      subs?.filter((s) => s.status === "active" || s.status === "trialing") ??
      [];
    const monthlyRevenue = activeSubs.reduce((sum, s) => {
      if (s.interval === "year") return sum + s.amount / 12;
      return sum + s.amount;
    }, 0);

    return {
      totalPaid,
      activeSubCount: activeSubs.length,
      monthlyRevenue,
      invoiceCount: invoices?.length ?? 0,
    };
  }, [subs, invoices]);

  const loading = subsLoading || invoicesLoading;

  // Non-clients have no Stripe billing — hide stat cards + Stripe tables.
  if (!email || !isClient) return null;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Paid"
          value={loading ? "--" : `$${formatPrice(stats.totalPaid)}`}
          icon={DollarSign}
          iconColor="bg-emerald-500/10 text-emerald-500"
          subtitle={
            stats.invoiceCount > 0
              ? `From ${stats.invoiceCount} invoice${stats.invoiceCount !== 1 ? "s" : ""}`
              : undefined
          }
        />
        <StatCard
          label="Active Subs"
          value={loading ? "--" : String(stats.activeSubCount)}
          icon={CreditCard}
          iconColor="bg-blue-500/10 text-blue-500"
          subtitle={
            subs && subs.length > stats.activeSubCount
              ? `${subs.length} total`
              : undefined
          }
        />
        <StatCard
          label="Monthly Revenue"
          value={loading ? "--" : `$${formatPrice(stats.monthlyRevenue)}/mo`}
          icon={TrendingUp}
          iconColor="bg-violet-500/10 text-violet-500"
        />
        <StatCard
          label="Invoices"
          value={loading ? "--" : String(stats.invoiceCount)}
          icon={FileText}
          iconColor="bg-amber-500/10 text-amber-500"
          subtitle={
            invoices?.some((i) => i.status !== "paid")
              ? `${invoices.filter((i) => i.status !== "paid").length} unpaid`
              : undefined
          }
        />
      </div>

      {/* Subscriptions */}
      <CardAgency.Card>
        <CardAgency.Header title="Stripe Subscriptions">
          {subs && <Badge variant="secondary">{subs.length}</Badge>}
        </CardAgency.Header>
        {subsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : !subs || subs.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No subscriptions found.
          </p>
        ) : (
          <div className="space-y-3">
            {subs.map((sub) => (
              <div
                key={sub.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border-l-4 p-4",
                  subStatusStyle[sub.status] ?? "border-l-zinc-300"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {sub.productName ?? (
                      <span className="font-mono text-xs opacity-60">
                        {sub.id.slice(0, 20)}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    <span className="font-semibold tabular-nums">
                      ${formatPrice(sub.amount)}
                    </span>{" "}
                    / {sub.interval ?? "one-time"}{" "}
                    {sub.currentPeriodEnd && (
                      <span className="ml-2">
                        ends{" "}
                        {format(
                          new Date(sub.currentPeriodEnd * 1000),
                          "MMM d, yyyy"
                        )}
                      </span>
                    )}
                  </p>
                </div>
                <Badge
                  variant={subBadgeVariant(sub.status)}
                  className="ml-3 text-[10px] capitalize"
                >
                  {sub.cancelAtPeriodEnd && sub.status === "active"
                    ? "canceling"
                    : sub.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardAgency.Card>

      {/* Invoices / Transactions */}
      <CardAgency.Card>
        <CardAgency.Header title="Stripe Transactions">
          {invoices && <Badge variant="secondary">{invoices.length}</Badge>}
        </CardAgency.Header>
        {invoicesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No transactions found.
          </p>
        ) : (
          <div className="rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">PDF</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const isExpanded = expandedInvoices.has(inv.id);
                  return (
                    <Fragment key={inv.id}>
                      <tr className="hover:bg-muted/50 border-b transition-colors last:border-b-0">
                        <td className="px-4 py-3 font-mono text-xs">
                          {inv.number ?? inv.id.slice(0, 16)}
                        </td>
                        <td className="px-4 py-3 font-bold tabular-nums">
                          ${formatPrice(inv.amountPaid)}{" "}
                          <span className="text-muted-foreground text-xs font-normal uppercase">
                            {inv.currency}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] capitalize",
                              invoiceBadge(inv.status ?? "")
                            )}
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-xs">
                          {format(new Date(inv.created * 1000), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          {inv.invoicePdf && (
                            <a
                              href={inv.invoicePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              setExpandedInvoices((prev) => {
                                const next = new Set(prev);
                                if (next.has(inv.id)) next.delete(inv.id);
                                else next.add(inv.id);
                                return next;
                              })
                            }
                            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                            Items
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/30">
                          <td colSpan={6} className="px-4 py-3">
                            <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase">
                              Line Items
                            </p>
                            {inv.lineItems.length === 0 ? (
                              <p className="text-muted-foreground text-xs">
                                No line items
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {inv.lineItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className="bg-background flex items-center justify-between rounded-lg border px-3 py-2"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm">
                                        {item.description ?? "—"}
                                      </p>
                                      {item.quantity && item.quantity > 1 && (
                                        <p className="text-muted-foreground text-xs">
                                          Qty: {item.quantity}
                                        </p>
                                      )}
                                    </div>
                                    <span className="ml-4 shrink-0 text-sm font-semibold tabular-nums">
                                      ${formatPrice(item.amount)}{" "}
                                      <span className="text-muted-foreground text-xs font-normal uppercase">
                                        {item.currency}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardAgency.Card>
    </div>
  );
}
