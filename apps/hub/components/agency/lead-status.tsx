import type { ReactNode } from "react";

import type { AgencyLeadStatus } from "@workspace/drizzle/schema";
import { cn } from "@workspace/ui/lib/utils";

export type PillTone =
  | "info"
  | "warning"
  | "success"
  | "danger"
  | "neutral"
  | "accent";

// Handoff status tones (light-only hex, matching the shipped business-info half).
const PILL_TONES: Record<PillTone, string> = {
  info: "bg-[#e4edf1] text-[#2d5e7a]",
  warning: "bg-[#f6eedb] text-[#8a5a0a]",
  success: "bg-[#e6efe4] text-[#2f6b3f]",
  danger: "bg-[#f8e6e7] text-[#a3283a]",
  neutral: "bg-foreground/5 text-muted-foreground",
  accent: "bg-primary/16 text-[#c2451f]",
};

/** Status pill: tone colour paired with a dot (spec rule 6). */
export function StatusPill({
  tone,
  dot = true,
  className,
  children,
}: {
  tone: PillTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold",
        PILL_TONES[tone],
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const LEAD_STATUS_TONE: Record<AgencyLeadStatus, PillTone> = {
  new: "info",
  contacted: "warning",
  qualified: "accent",
  won: "success",
  lost: "neutral",
  spam: "neutral",
};

export const LEAD_STATUSES: { value: AgencyLeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "spam", label: "Spam" },
];

export const leadStatusLabel = (status: AgencyLeadStatus) =>
  LEAD_STATUSES.find((s) => s.value === status)?.label ?? status;

export function LeadStatusBadge({ status }: { status: AgencyLeadStatus }) {
  return (
    <StatusPill tone={LEAD_STATUS_TONE[status]}>
      {leadStatusLabel(status)}
    </StatusPill>
  );
}

export const formatMoney = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

// "YYYY-MM-DD" for the last `days` days, ending today (UTC).
export const lastDays = (days: number) => {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
};

export const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;
export type RangeValue = (typeof RANGES)[number]["value"];
