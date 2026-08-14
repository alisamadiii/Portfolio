"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

// ─── Helpers ────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  // Subscription statuses
  active: "bg-status-success-bg text-status-success",
  trialing: "bg-status-info-bg text-status-info",
  past_due: "bg-status-warning-bg text-status-warning",
  canceled: "bg-status-danger-bg text-status-danger",
  unpaid: "bg-status-warning-bg text-status-warning",
  incomplete: "bg-status-warning-bg text-status-warning",
  incomplete_expired: "bg-status-neutral-bg text-status-neutral",
  canceling: "bg-status-warning-bg text-status-warning",
  // Stripe invoice statuses
  paid: "bg-status-success-bg text-status-success",
  open: "bg-status-info-bg text-status-info",
  void: "bg-status-danger-bg text-status-danger",
  uncollectible: "bg-status-danger-bg text-status-danger",
  draft: "bg-status-neutral-bg text-status-neutral",
};

export const formatCurrency = (amount: number, currency: string = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

// ─── Shared bits ────────────────────────────────────────────────

export const StatusPill = ({ status }: { status: string }) => (
  <span
    className={cn(
      "rounded-full px-3 py-1 text-xs font-semibold capitalize",
      STATUS_PILL[status] ?? "bg-status-neutral-bg text-status-neutral"
    )}
  >
    {status.replace(/_/g, " ")}
  </span>
);

export const SectionHeading = ({
  children,
}: {
  children: React.ReactNode;
}) => <h3 className="text-2xl font-extrabold tracking-tight">{children}</h3>;

export const EmptyPanel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-muted-foreground rounded-lg border border-dashed py-14 text-center text-[14.5px]">
    {children}
  </div>
);

export const RowSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-16 w-full rounded-lg" />
    <Skeleton className="h-16 w-full rounded-lg" />
  </div>
);
