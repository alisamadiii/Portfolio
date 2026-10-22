import type { AgencyLeadStatus } from "@workspace/drizzle/schema";
import { cn } from "@workspace/ui/lib/utils";

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
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
        status === "new" && "bg-sky-500/12 text-sky-700 dark:text-sky-300",
        status === "contacted" && "bg-amber-500/12 text-amber-700 dark:text-amber-300",
        status === "qualified" && "bg-violet-500/12 text-violet-700 dark:text-violet-300",
        status === "won" && "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300",
        (status === "lost" || status === "spam") && "bg-muted text-muted-foreground"
      )}
    >
      {leadStatusLabel(status)}
    </span>
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
