"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

const tones = {
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  violet:
    "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  orange:
    "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  green:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
} as const;

export const StatTile = ({
  icon,
  tone = "green",
  label,
  value,
  delta,
  sub,
  isLoading,
  className,
}: {
  icon?: React.ReactNode;
  tone?: keyof typeof tones;
  label: string;
  value: React.ReactNode;
  /** Signed delta string, e.g. "+12%" — colored green/red by its sign */
  delta?: string;
  sub?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}) => {
  const negative = delta?.trimStart().startsWith("-");

  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-4 rounded-2xl border p-5",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
              tones[tone]
            )}
          >
            {icon}
          </div>
        )}
        <span className="text-muted-foreground text-sm font-medium">
          {label}
        </span>
      </div>
      {isLoading ? (
        <Skeleton className="h-9 w-24" />
      ) : (
        <div className="flex items-end justify-between gap-2">
          <span className="text-num text-3xl font-semibold tracking-tight">
            {value}
          </span>
          {delta ? (
            <span
              className={cn(
                "text-num pb-0.5 text-sm font-medium",
                negative ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {delta}
            </span>
          ) : (
            sub && (
              <span className="text-muted-foreground pb-0.5 text-xs">
                {sub}
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
};
