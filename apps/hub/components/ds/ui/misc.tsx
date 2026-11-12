import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

/** Rounded icon square. coral = included/active app, neutral = locked/empty states. */
export function IconTile({
  children,
  tone = "coral",
  size = 40,
}: {
  children: ReactNode;
  tone?: "coral" | "neutral";
  size?: 32 | 36 | 40 | 48 | 56;
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[9px]",
        tone === "coral" ? "bg-coral-soft text-coral-deep" : "bg-tile text-ink-3"
      )}
    >
      {children}
    </span>
  );
}

/** 6px track, coral fill. */
export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-divider", className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-coral"
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/** Centered empty state inside a card or table. */
export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-12 text-center">
      <IconTile tone="neutral">{icon}</IconTile>
      <span className="mt-1 text-[15px] font-semibold">{title}</span>
      <p className="max-w-[420px] text-[13px] leading-normal text-dim">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Thin card of "fact + link" cells separated by dividers (plan · domain · status …). */
export function InfoStrip({
  items,
  trailing,
}: {
  items: { label: ReactNode; value: ReactNode }[];
  trailing?: ReactNode;
}) {
  return (
    <section className="flex flex-wrap items-center rounded-card border border-line bg-surface px-2 py-1">
      {items.map((it, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col gap-0.5 px-4 py-3",
            i < items.length - 1 && "border-r border-divider"
          )}
        >
          <span className="text-[13px] text-ink">{it.label}</span>
          <span className="text-[13px]">{it.value}</span>
        </div>
      ))}
      {trailing && (
        <>
          <div className="flex-1" />
          {trailing}
        </>
      )}
    </section>
  );
}

/** KPI row: label 13 muted, value 24/600. Use "—" for unknown, never invent numbers. `dim` = not connected yet. */
export function KpiGrid({
  items,
  dim,
  bare,
}: {
  items: { label: string; value: string; sub?: string }[];
  dim?: boolean;
  /** No card border (when nested inside another card). */
  bare?: boolean;
}) {
  return (
    <section
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))]",
        !bare && "rounded-card border border-line bg-surface p-2",
        dim && "opacity-60"
      )}
    >
      {items.map((k, i) => (
        <div key={k.label} className={cn("flex flex-col gap-1 px-4 py-3", i > 0 && "border-l border-divider")}>
          <span className="text-[13px] text-dim">{k.label}</span>
          <span className={cn("text-2xl font-semibold tracking-[-0.01em]", k.value === "—" && "text-faint")}>
            {k.value}
          </span>
          {k.sub && <span className="text-xs text-faint">{k.sub}</span>}
        </div>
      ))}
    </section>
  );
}

/** Small "A" tile with the first letter of a name (sites table, project switcher). */
export function LetterTile({
  name,
  size = 36,
  tone = "neutral",
}: {
  name: string;
  size?: 24 | 28 | 36;
  tone?: "neutral" | "ink";
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[8px] font-semibold",
        size <= 28 ? "rounded-[5px] text-xs" : "text-sm",
        tone === "ink" ? "bg-ink text-white" : "bg-tile text-ink-3"
      )}
    >
      {(name.trim().replace(/^www\./i, "")[0] ?? "?").toUpperCase()}
    </span>
  );
}
