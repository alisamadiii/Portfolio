import type { ComponentProps, ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

const control =
  "w-full rounded-control border border-line-strong bg-surface px-2.5 text-sm text-ink placeholder:text-faint " +
  "focus:border-coral focus:outline-none focus:ring-[3px] focus:ring-coral-soft disabled:opacity-60";

export function Input({ className, ...p }: ComponentPropsWithoutRef<"input">) {
  return <input className={cn(control, "h-9", className)} {...p} />;
}
// Takes a ref (React 19 ref-as-prop): TemplateTextarea reads the caret.
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-[76px] resize-y py-2.5 leading-relaxed", className)} {...p} />;
}
export function Select({ className, ...p }: ComponentPropsWithoutRef<"select">) {
  return <select className={cn(control, "h-9", className)} {...p} />;
}

/** Label (14/600) + optional hint (13 muted) + control. Wraps in <label> so clicking the text focuses the input. */
export function Field({
  label,
  hint,
  optional,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-dim"> · optional</span>}
      </span>
      {hint && <span className="text-[13px] text-dim">{hint}</span>}
      <span className="mt-0.5">{children}</span>
    </label>
  );
}
