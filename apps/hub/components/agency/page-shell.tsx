import type { ReactNode } from "react";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { HoverInfo } from "@/components/agency/hover-info";

/** Nested-frame card: tinted 6px outer frame, paper inner. */
export function FrameCard({
  className,
  innerClassName,
  children,
}: {
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-foreground/3 ring-foreground/4 rounded-[18px] p-1.5 ring-1",
        className
      )}
    >
      <div
        className={cn(
          "bg-card rounded-[14px] p-7 shadow-[0_6px_16px_rgba(27,26,23,0.05)]",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Mono uppercase section kicker. Pass a coral dot via `children` when needed. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground font-mono text-[13px] tracking-[0.12em] uppercase",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Label + one-line hint above an input, handoff sizes. */
export function FieldHead({
  label,
  hint,
  optional,
  htmlFor,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[16px] font-semibold">
        {label}
        {optional && (
          <span className="text-muted-foreground font-normal"> · optional</span>
        )}
      </label>
      {hint && <span className="text-muted-foreground text-[15px]">{hint}</span>}
    </div>
  );
}

/**
 * Shared page header + body wrapper for every agency page. Width-agnostic —
 * AgencyMain owns the max-width. `controls` sits on the header's right,
 * `tabs` renders a nav row directly under the header (marketing).
 */
export function PageShell({
  eyebrow,
  title,
  lead,
  controls,
  tabs,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  controls?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-[22px]">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 flex-col gap-3">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="text-[44px] leading-[1.05] font-semibold tracking-[-0.03em]">
              {title}
            </h1>
            {lead && (
              <p className="text-muted-foreground max-w-[680px] text-[18px] leading-relaxed">
                {lead}
              </p>
            )}
          </div>
          {controls && (
            <div className="flex flex-wrap items-center gap-3">{controls}</div>
          )}
        </header>
        {tabs}
      </div>
      {children}
    </div>
  );
}

export interface StatCell {
  label: string;
  /** `null` renders a skeleton (loading). */
  value: ReactNode | null;
  sub?: ReactNode;
  /** Explanation popover shown next to the label. */
  info?: { title: string; content: ReactNode };
}

/** One card split into hairline-divided stat cells. */
export function StatCardRow({
  cells,
  footer,
  className,
}: {
  cells: StatCell[];
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card ring-foreground/7 overflow-hidden rounded-[18px] shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1",
        className
      )}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
        {cells.map((cell, i) => (
          <div
            key={i}
            className="border-foreground/7 flex flex-col gap-2 border-r p-6 last:border-r-0"
          >
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[15px]">
              {cell.label}
              {cell.info && (
                <HoverInfo title={cell.info.title} content={cell.info.content} />
              )}
            </span>
            {cell.value === null ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <span className="text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {cell.value}
              </span>
            )}
            {cell.sub && (
              <span className="text-muted-foreground text-[14px]">
                {cell.sub}
              </span>
            )}
          </div>
        ))}
      </div>
      {footer && (
        <div className="border-foreground/7 bg-foreground/2 border-t p-6">
          {footer}
        </div>
      )}
    </div>
  );
}

/** Card wrapper for a table: shared surface + horizontal scroll on mobile. */
export function TableCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-card ring-foreground/7 overflow-x-auto rounded-[18px] shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1",
        className
      )}
    >
      {children}
    </div>
  );
}
