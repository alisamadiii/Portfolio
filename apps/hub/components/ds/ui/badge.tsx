import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

/** Small status label: 22px tall, 4px radius, 12px/500. Square-ish, not a pill. */
export type BadgeTone = "success" | "neutral" | "coral" | "info" | "warning";

const tones: Record<BadgeTone, string> = {
  success: "bg-success-soft text-success-text",
  neutral: "bg-badge-neutral text-ink-3",
  coral: "bg-coral-soft text-coral-deep",
  info: "bg-info-soft text-info-text",
  warning: "bg-warning-soft text-ink-3",
};
const dots: Record<BadgeTone, string> = {
  success: "bg-success",
  neutral: "bg-faint",
  coral: "bg-coral",
  info: "bg-info",
  warning: "bg-warning",
};

export function Badge({
  tone = "neutral",
  dot,
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded px-2 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} />}
      {icon}
      {children}
    </span>
  );
}

/** "● Live" style inline status (no background). */
export function StatusText({
  tone = "success",
  children,
}: {
  tone?: "success" | "neutral" | "danger";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[13px] font-medium",
        tone === "success" && "text-success-text",
        tone === "neutral" && "text-dim",
        tone === "danger" && "text-danger"
      )}
    >
      <span
        className={cn(
          "size-[7px] rounded-full",
          tone === "success" && "bg-success",
          tone === "neutral" && "bg-faint",
          tone === "danger" && "bg-danger"
        )}
      />
      {children}
    </span>
  );
}
