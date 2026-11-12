"use client";

import { cn } from "@workspace/ui/lib/utils";

export type TabItem = { id: string; label: string; count?: number };

/** Grey track with a white raised chip for the active option. Filters inside a card toolbar. */
export function SegmentedTabs({
  items,
  value,
  onChange,
  label,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-[7px] bg-subtle p-[3px]">
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "h-[30px] rounded-[5px] px-3 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
              active ? "bg-surface font-medium text-ink shadow-tab" : "text-ink-3"
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1 text-faint">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Underline tabs under a page title (Overview / All leads / …). Active = ink text + 2px coral underline. */
export function UnderlineTabs({
  items,
  value,
  onChange,
  label,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-6 border-b border-line">
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "-mb-px flex h-10 items-center border-b-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
              active ? "border-coral font-medium text-ink" : "border-transparent text-dim hover:text-ink"
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-faint">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
