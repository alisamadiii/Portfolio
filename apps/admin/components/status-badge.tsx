"use client";

import { cn } from "@workspace/ui/lib/utils";

const tones = {
  green:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  orange:
    "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  gray: "bg-muted text-muted-foreground",
  violet:
    "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
} as const;

const dots = {
  green: "bg-emerald-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  gray: "bg-muted-foreground/60",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
} as const;

export const StatusBadge = ({
  tone,
  dot,
  className,
  children,
}: {
  tone: keyof typeof tones;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <span
    className={cn(
      "inline-flex h-5.5 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
      tones[tone],
      className
    )}
  >
    {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} />}
    {children}
  </span>
);
