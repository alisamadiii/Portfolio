"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { Braces, FileText } from "lucide-react";

import {
  applyInsert,
  findTrigger,
  matchPlaceholders,
  type Trigger,
} from "@workspace/trpc/lib/templates-shared";
import { cn } from "@workspace/ui/lib/utils";

import { Textarea } from "@/components/ds/ui/field";

export type Snippet = { id: number; name: string; body: string };

type Item = { key: string; label: string; hint: string; insert: string; icon: "snippet" | "placeholder" };

/**
 * Textarea with two suggestion menus: "/" lists the project's text snippets
 * (inserts the body), "[[" lists placeholders (inserts "[[lead name]]").
 * Arrow keys move, Enter/Tab pick, Esc closes.
 */
export function TemplateTextarea({
  value,
  onValueChange,
  snippets = [],
  placeholders = true,
  resolve,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"textarea">, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  snippets?: Snippet[];
  /** Offer "[[" placeholders (off where they can't be filled). */
  placeholders?: boolean;
  /** Fills a snippet's [[placeholders]] on insert (e.g. lead notes). */
  resolve?: (text: string) => string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [index, setIndex] = useState(0);

  const items: Item[] = !trigger
    ? []
    : trigger.kind === "slash"
      ? snippets
          .filter((s) => s.name.toLowerCase().includes(trigger.query.toLowerCase()))
          .slice(0, 8)
          .map((s) => ({
            key: `s${s.id}`,
            label: s.name,
            hint: s.body.replace(/\s+/g, " ").slice(0, 80),
            insert: resolve ? resolve(s.body) : s.body,
            icon: "snippet" as const,
          }))
      : placeholders
        ? matchPlaceholders(trigger.query).map((p) => ({
            key: p.key,
            label: p.key,
            hint: p.group,
            insert: `[[${p.key}]]`,
            icon: "placeholder" as const,
          }))
        : [];
  const open = items.length > 0;

  useEffect(() => setIndex(0), [trigger?.kind, trigger?.query]);

  const sync = (el: HTMLTextAreaElement) => setTrigger(findTrigger(el.value, el.selectionStart));

  const pick = (item: Item) => {
    const el = ref.current;
    if (!el || !trigger) return;
    const next = applyInsert(value, trigger, el.selectionStart, item.insert);
    onValueChange(next.text);
    setTrigger(null);
    // Caret after the inserted text once React has rendered it.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.caret, next.caret);
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          sync(e.target);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const delta = e.key === "ArrowDown" ? 1 : -1;
            setIndex((i) => (i + delta + items.length) % items.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            pick(items[index]!);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setTrigger(null);
          }
        }}
        onClick={(e) => sync(e.currentTarget)}
        onBlur={() => setTrigger(null)}
        className={className}
        {...props}
      />
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-control border border-line bg-surface p-1 shadow-md"
        >
          <div className="px-2 pb-1 pt-0.5 text-[11px] text-faint">
            {trigger?.kind === "slash" ? "Snippets" : "Placeholders"}
          </div>
          {items.map((item, i) => (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={i === index}
              onMouseDown={(e) => {
                // mousedown so the textarea keeps focus
                e.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setIndex(i)}
              className={cn(
                "flex w-full items-start gap-2 rounded-[5px] px-2 py-1.5 text-left",
                i === index && "bg-hover"
              )}
            >
              {item.icon === "snippet" ? (
                <FileText className="mt-0.5 size-3.5 shrink-0 text-coral-text" />
              ) : (
                <Braces className="mt-0.5 size-3.5 shrink-0 text-coral-text" />
              )}
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-medium text-ink">{item.label}</span>
                {item.hint && <span className="truncate text-[12px] text-dim">{item.hint}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
