"use client";

import Link from "next/link";
import { useUser } from "@/contexts/user-context";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowRight, Bot, Globe, PenLine, ReceiptText } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { CmsProjectsDialog } from "@/components/cms-projects-dialog";
import { DocumentTitle } from "@/components/document-title";
import { StatusDot } from "@/components/status-dot";

const STATUS_PILL: Record<string, string> = {
  active: "bg-status-success-bg text-status-success",
  trialing: "bg-status-info-bg text-status-info",
  past_due: "bg-status-warning-bg text-status-warning",
  canceled: "bg-status-danger-bg text-status-danger",
  paid: "bg-status-success-bg text-status-success",
  open: "bg-status-info-bg text-status-info",
  draft: "bg-status-neutral-bg text-status-neutral",
  "in progress": "bg-status-warning-bg text-status-warning",
  "to do": "bg-status-info-bg text-status-info",
  review: "bg-status-review-bg text-status-review",
  done: "bg-status-success-bg text-status-success",
  complete: "bg-status-success-bg text-status-success",
};

const Pill = ({ status }: { status: string }) => (
  <span
    className={cn(
      "rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold capitalize",
      STATUS_PILL[status.toLowerCase()] ??
        "bg-status-neutral-bg text-status-neutral"
    )}
  >
    {status.replace(/_/g, " ")}
  </span>
);

const formatCurrency = (amount: number, currency: string = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

const SectionCard = ({
  title,
  icon: Icon,
  href,
  linkLabel,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href?: string;
  linkLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-card flex flex-col overflow-hidden rounded-lg border">
    <div className="border-rule flex items-center gap-3 border-b px-5 py-4">
      <div className="bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center rounded-[10px]">
        <Icon className="size-4.5" />
      </div>
      <p className="flex-1 text-[15px] font-extrabold tracking-tight">
        {title}
      </p>
      {action ??
        (href && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -mr-2 gap-1 text-[13px]"
            render={<Link href={href} />}
          >
            {linkLabel}
            <ArrowRight className="size-3.5" />
          </Button>
        ))}
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

const RowSkeleton = () => (
  <div className="space-y-3 px-5 py-4">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

const EmptyNote = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground px-5 py-5 text-[13.5px]">{children}</p>
);

// ─── Website status ─────────────────────────────────────────────

const WebsiteSection = () => {
  const trpc = useTRPC();
  const { data: currentUser } = useCurrentUser();
  const { data: sites, isPending } = useQuery(
    trpc.websites.getMine.queryOptions(undefined, { enabled: !!currentUser })
  );

  return (
    <SectionCard title="Website" icon={Globe} href="/website" linkLabel="View">
      {isPending ? (
        <RowSkeleton />
      ) : !sites?.length ? (
        <EmptyNote>Your website will appear here once it's set up.</EmptyNote>
      ) : (
        sites.map((site) => (
          <div
            key={site.id}
            className="border-rule flex items-center gap-3 border-b px-5 py-4 last:border-b-0"
          >
            <StatusDot up={site.status.up} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {site.label || site.domain}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {site.status.responseTimeMs != null
                  ? `${site.status.responseTimeMs} ms · `
                  : ""}
                checked{" "}
                {formatDistanceToNow(new Date(site.status.checkedAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
                site.status.up
                  ? "bg-status-success-bg text-status-success"
                  : "bg-status-danger-bg text-status-danger"
              )}
            >
              {site.status.up ? "Live" : "Down"}
            </span>
          </div>
        ))
      )}
    </SectionCard>
  );
};

// ─── CMS shortcut ───────────────────────────────────────────────

const CmsSection = () => {
  const { user } = useUser();
  const projectCount = user?.accounts?.length ?? 0;

  return (
    <SectionCard
      title="Content"
      icon={PenLine}
      action={
        <CmsProjectsDialog>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -mr-2 gap-1 text-[13px]"
          >
            Open
            <ArrowRight className="size-3.5" />
          </Button>
        </CmsProjectsDialog>
      }
    >
      <div className="px-5 py-4">
        <p className="text-sm font-semibold">
          {projectCount > 0
            ? `${projectCount} project${projectCount > 1 ? "s" : ""} available`
            : "No projects yet"}
        </p>
        <p className="text-muted-foreground mt-1 text-[13.5px]">
          Edit your website's pages, posts and media in the CMS.
        </p>
        <CmsProjectsDialog>
          <Button size="sm" className="mt-3.5 rounded-full px-4">
            Open CMS
          </Button>
        </CmsProjectsDialog>
      </div>
    </SectionCard>
  );
};

// ─── Billing snapshot ───────────────────────────────────────────

const BillingSection = () => {
  const trpc = useTRPC();
  const { data: currentUser } = useCurrentUser();

  const { data: subs, isPending: subsPending } = useQuery(
    trpc.payments.getStripeSubscriptions.queryOptions(undefined, {
      enabled: !!currentUser,
    })
  );
  const { data: invoices, isPending: invoicesPending } = useQuery(
    trpc.payments.getStripeInvoices.queryOptions(undefined, {
      enabled: !!currentUser,
    })
  );

  const sub = subs?.[0];
  const invoice = invoices?.[0];

  return (
    <SectionCard
      title="Billing"
      icon={ReceiptText}
      href="/billing"
      linkLabel="Manage"
    >
      {subsPending || invoicesPending ? (
        <RowSkeleton />
      ) : !sub && !invoice ? (
        <EmptyNote>No subscription or invoices yet.</EmptyNote>
      ) : (
        <>
          {sub && (
            <div className="border-rule flex items-center gap-3 border-b px-5 py-4 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {sub.productName || "Subscription"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatCurrency(sub.amount, sub.currency)}/
                  {sub.interval ?? "month"} · renews{" "}
                  {format(new Date(sub.currentPeriodEnd * 1000), "MMM d")}
                </p>
              </div>
              <Pill status={sub.cancelAtPeriodEnd ? "canceled" : sub.status} />
            </div>
          )}
          {invoice && (
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-medium">
                  {invoice.number || "Latest invoice"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatCurrency(invoice.amountPaid, invoice.currency)} ·{" "}
                  {format(new Date(invoice.created * 1000), "MMM d, yyyy")}
                </p>
              </div>
              <Pill status={invoice.status ?? "draft"} />
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
};

// ─── Recent requests ────────────────────────────────────────────

const RequestsSection = () => {
  const trpc = useTRPC();
  const { data, isPending } = useQuery(trpc.clickup.getTasks.queryOptions());

  const tasks = [...(data?.tasks ?? [])]
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .slice(0, 3);

  return (
    <SectionCard
      title="Recent requests"
      icon={Bot}
      href="/requests"
      linkLabel="View all"
    >
      {isPending ? (
        <RowSkeleton />
      ) : tasks.length === 0 ? (
        <EmptyNote>No requests yet.</EmptyNote>
      ) : (
        tasks.map((task) => (
          <div
            key={task.id}
            className="border-rule flex items-center gap-3 border-b px-5 py-3.5 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {task.description || task.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(Number(task.createdAt)), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <Pill status={task.status} />
          </div>
        ))
      )}
    </SectionCard>
  );
};

// ─── Page ───────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useUser();
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <DocumentTitle title="Home" />
      <div>
        <h1 className="text-[32px] font-extrabold tracking-tight">
          Welcome{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1.5 text-[15px]">
          Everything about your website, in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <WebsiteSection />
        <CmsSection />
        <BillingSection />
        <RequestsSection />
      </div>
    </div>
  );
}
