"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Gift,
  Globe,
  Heart,
  Sparkles,
} from "@/components/icon";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Spinner } from "@workspace/ui/components/spinner";
import { DataTable } from "@workspace/ui/custom/data-table";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";

import {
  formatCurrency,
  SectionHeading,
  StatusPill,
} from "@/components/billing/shared";
import { PanelError } from "@/components/settings/panel-error";

type ProjectSubscription = NonNullable<
  RouterOutputs["cms"]["subscription"]["getProject"]["subscription"]
>;

// ─── Panel (in-shell, rendered from Site Settings › Billing) ─────
// Self-contained: resolves the current project from config, fetches its
// subscription, and branches into the picker / manage / free views.

export const ProjectBillingPanel = () => {
  const trpc = useTRPC();
  const { config } = useConfig();
  const { user } = useUser();

  const owner = config?.owner;
  const repo = config?.repo;

  const { data, isLoading, error, refetch, isRefetching } = useQuery(
    trpc.cms.subscription.getProject.queryOptions(
      { owner: owner ?? undefined, repo: repo ?? "" },
      { enabled: !!repo }
    )
  );

  // Back from Stripe checkout: the webhook writes the row asynchronously, so
  // clear the flag and refetch (twice, to outrun webhook lag).
  const handledReturn = useRef(false);
  useEffect(() => {
    if (handledReturn.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("purchase") !== "success") return;
    handledReturn.current = true;
    url.searchParams.delete("purchase");
    window.history.replaceState(null, "", url.toString());
    void refetch();
    const t = setTimeout(() => void refetch(), 2500);
    return () => clearTimeout(t);
  }, [refetch]);

  return (
    <div className="mx-auto w-full max-w-screen-md p-6">
      <div className="mb-6">
        <h2 className="text-[22px] font-extrabold tracking-tight">Billing</h2>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Subscription and invoices for this project.
        </p>
      </div>

      {error ? (
        <PanelError
          title="Failed to load billing"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isRefetching}
        />
      ) : isLoading || !data ? (
        <div className="flex justify-center py-24">
          <Spinner className="text-muted-foreground size-6" />
        </div>
      ) : data.freeLife ? (
        <FreeForLifePanel />
      ) : !data.subscription ? (
        user && repo ? (
          <ProjectPlans
            repoId={data.repoId}
            userId={user.id}
            userEmail={user.email}
            userName={user.name}
          />
        ) : null
      ) : data.subscription.plan === "free" ||
        data.subscription.plan === "free_lifetime" ? (
        <FreePlanPanel plan={data.subscription.plan} />
      ) : (
        <ProjectManage repoId={data.repoId} subscription={data.subscription} />
      )}
    </div>
  );
};

// ─── Plans (products) ───────────────────────────────────────────
// The recurring plans the project checkout supports. Price is intentionally
// not hardcoded here — Stripe's checkout page shows the live price, and the
// app's prices live in the portfolio's pricing.ts. Extend as products grow.

type PlanKey = "monthly" | "cms";

const PROJECT_PLANS: {
  key: PlanKey;
  name: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
}[] = [
  {
    key: "monthly",
    name: "Website Management",
    description:
      "Fully managed website — hosting, domain, email, and ongoing updates.",
    features: ["Hosting & domain", "Priority updates", "Email included"],
    icon: <Globe className="size-5" />,
    popular: true,
  },
  {
    key: "cms",
    name: "CMS Access",
    description: "Edit your site content yourself, anytime, from the hub.",
    features: ["Self-serve editing", "Media library", "Draft & publish"],
    icon: <Sparkles className="size-5" />,
  },
];

// ─── Products picker (no subscription yet) ──────────────────────

export const ProjectPlans = ({
  repoId,
  userId,
  userEmail,
  userName,
}: {
  repoId: number;
  userId: string;
  userEmail: string;
  userName?: string;
}) => {
  const [checkingOut, setCheckingOut] = useState<PlanKey | null>(null);

  const subscribe = async (plan: PlanKey) => {
    if (!userEmail) {
      toast.error("Sign in with your email before subscribing.");
      return;
    }
    setCheckingOut(plan);
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}?purchase=success`;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/agency/checkouts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            email: userEmail,
            name: userName || undefined,
            repoId,
            userId,
            returnUrl,
          }),
        }
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.url) {
        throw new Error(payload?.error || "Failed to start checkout.");
      }
      window.location.assign(payload.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout."
      );
      setCheckingOut(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <SectionHeading>Choose a plan</SectionHeading>
        <p className="text-muted-foreground text-[14.5px]">
          This project doesn&apos;t have an active subscription yet. Pick a plan
          to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PROJECT_PLANS.map((plan) => (
          <div
            key={plan.key}
            className="bg-card relative flex flex-col rounded-lg border p-5.5"
          >
            {plan.popular && (
              <span className="bg-accent text-accent-foreground absolute -top-2.5 right-5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                Popular
              </span>
            )}
            <div className="bg-accent text-accent-foreground grid size-11 place-items-center rounded-[12px]">
              {plan.icon}
            </div>
            <p className="mt-4 text-[18px] font-extrabold tracking-tight">
              {plan.name}
            </p>
            <p className="text-muted-foreground mt-1 text-[13.5px]">
              {plan.description}
            </p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13.5px]">
                  <Check className="text-status-success size-4 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="mt-5 w-full rounded-full"
              disabled={checkingOut !== null}
              isLoading={checkingOut === plan.key}
              onClick={() => subscribe(plan.key)}
            >
              Subscribe
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Free / free-for-life panel ─────────────────────────────────

export const FreePlanPanel = ({
  plan,
}: {
  plan: "free" | "free_lifetime";
}) => (
  <div className="bg-card rounded-lg border px-6 py-14 text-center">
    <div className="bg-status-success-bg text-status-success mx-auto grid size-14 place-items-center rounded-full">
      <Sparkles className="size-7" />
    </div>
    <h3 className="mt-5 text-[22px] font-extrabold tracking-tight">
      {plan === "free_lifetime" ? "Free for life" : "Free plan"}
    </h3>
    <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[14.5px]">
      {plan === "free_lifetime"
        ? "This project is on the house — no subscription needed, ever. Enjoy full access."
        : "This project is on a complimentary plan. No billing is required right now."}
    </p>
    <div className="mt-6">
      <RequestDialog>
        <Button variant="outline" className="rounded-full px-5">
          Request a change
        </Button>
      </RequestDialog>
    </div>
  </div>
);

// ─── Free-for-life panel (agency gift, cms_org_repo.free_life) ───
// Shown when a project is flagged free-for-life on the repo — a gesture of
// gratitude, granting full access forever with nothing to pay. Distinct from
// FreePlanPanel (which reflects a free/free_lifetime subscription row).

const FREE_FOR_LIFE_PERKS = [
  "Full CMS access",
  "Media library",
  "Draft & publish",
  "No billing, ever",
];

export const FreeForLifePanel = () => (
  <div className="bg-card overflow-hidden rounded-lg border">
    <div className="from-primary/10 to-accent/40 relative bg-gradient-to-br px-6 py-12 text-center">
      <div className="bg-primary text-primary-foreground mx-auto grid size-16 place-items-center rounded-2xl shadow-sm">
        <Gift className="size-8" />
      </div>
      <h3 className="mt-6 text-[26px] font-extrabold tracking-tight">
        Free for life
      </h3>
      <p className="text-muted-foreground mx-auto mt-2.5 max-w-[440px] text-[14.5px] leading-relaxed">
        This project is on us — full access, forever. It&apos;s our way of
        saying thank you. There&apos;s nothing to pay, now or ever.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 px-6 py-6 sm:grid-cols-4">
      {FREE_FOR_LIFE_PERKS.map((perk) => (
        <div key={perk} className="flex items-center gap-2 text-[13.5px]">
          <Check className="text-primary size-4 shrink-0" />
          {perk}
        </div>
      ))}
    </div>

    <div className="border-rule flex items-center justify-between gap-3 border-t px-6 py-5">
      <p className="text-muted-foreground flex items-center gap-1.5 text-[13px]">
        <Heart className="text-primary size-3.5" />
        With gratitude, from AliSamadii.LLC
      </p>
      <RequestDialog>
        <Button variant="outline" className="rounded-full px-5">
          Request a change
        </Button>
      </RequestDialog>
    </div>
  </div>
);

// ─── Manage view (paid subscription) ────────────────────────────

type ProjectInvoice =
  RouterOutputs["cms"]["subscription"]["getInvoices"][number];

export const ProjectManage = ({
  repoId,
  subscription,
}: {
  repoId: number;
  subscription: ProjectSubscription;
}) => {
  const trpc = useTRPC();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const {
    data: invoices,
    isFetching: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useQuery(trpc.cms.subscription.getInvoices.queryOptions({ repoId }));

  const portalMutation = useMutation(
    trpc.cms.subscription.createPortalSession.mutationOptions()
  );

  const openPortal = () =>
    portalMutation.mutate(
      { repoId, returnUrl: window.location.href },
      {
        onSuccess: (data) => {
          if (data.url) window.open(data.url, "_blank");
        },
        onError: (error) => toast.error(error.message),
      }
    );

  const toggle = (rowId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });

  const isCanceling =
    subscription.cancelAtPeriodEnd || subscription.status === "canceled";
  const renewal = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="border-rule flex items-center gap-4 border-b px-5.5 py-5.5">
          <div className="bg-accent text-accent-foreground grid size-12.5 shrink-0 place-items-center rounded-[14px]">
            <Globe className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[19px] font-extrabold tracking-tight">
              Project subscription
            </p>
            <p className="text-muted-foreground text-[13.5px]">
              Managed by AliSamadii.LLC
            </p>
          </div>
          <StatusPill
            status={isCanceling ? "canceling" : (subscription.status ?? "active")}
          />
        </div>

        <div className="border-rule grid grid-cols-1 border-b sm:grid-cols-3">
          <Stat
            label="Next renewal"
            value={renewal ? format(renewal, "MMM d, yyyy") : "—"}
          />
          <Stat label="Plan" value="Paid" />
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
            disabled={portalMutation.isPending}
            isLoading={portalMutation.isPending}
            onClick={openPortal}
          >
            Manage billing
          </Button>
        </div>
      </div>

      <section className="space-y-4 pt-2">
        <SectionHeading>Invoices</SectionHeading>
        {invoicesError ? (
          <PanelError
            title="Failed to load invoices"
            message={invoicesError.message}
            onRetry={() => void refetchInvoices()}
            retrying={invoicesLoading}
          />
        ) : invoicesLoading ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : (invoices?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed px-6 py-10 text-center">
            <h3 className="text-[19px] font-extrabold tracking-tight">
              No invoices yet
            </h3>
            <p className="text-muted-foreground mx-auto mt-2 max-w-[380px] text-[14.5px]">
              Your first invoice appears here after your first billing cycle.
            </p>
          </div>
        ) : (
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
                    {format(new Date(row.original.created * 1000), "MMM d, yyyy")}
                  </span>
                ),
              },
              {
                id: "actions",
                header: "",
                cell: ({ row }) => {
                  const { hostedInvoiceUrl, invoicePdf } = row.original;
                  const isExpanded = expanded.has(row.id);
                  return (
                    <div className="flex justify-end gap-1">
                      {hostedInvoiceUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          render={
                            <a
                              href={hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          }
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      )}
                      {invoicePdf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          render={
                            <a
                              href={invoicePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          }
                        >
                          <FileText className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(row.id);
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
            data={invoices ?? []}
            expandedRows={expanded}
            renderExpandedRow={(row) => (
              <InvoiceDetailsPanel invoice={row.original} />
            )}
          />
        )}
      </section>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="border-rule border-r px-5.5 py-4.5 last:border-r-0">
    <p className="text-muted-foreground text-[11.5px] font-semibold tracking-[0.04em] uppercase">
      {label}
    </p>
    <p className="mt-1 text-[15px] font-bold">{value}</p>
  </div>
);

const InvoiceDetailsPanel = ({ invoice }: { invoice: ProjectInvoice }) => (
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
