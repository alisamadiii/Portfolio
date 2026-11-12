import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { Card } from "./card";
import { Progress } from "./misc";

export type ChecklistItem = {
  id: string;
  title: string;
  state: "done" | "active" | "todo";
  /** Shown only when state === "active" (the expanded row). */
  description?: string;
  action?: ReactNode;
  /** Right side for todo rows, e.g. "0 of 7 sections". */
  meta?: string;
  /** Right-side link label for todo rows (default "Continue"). */
  linkLabel?: string;
  href?: string;
};

/**
 * "Getting started" card. Rows are 48px bordered boxes.
 * done = green check + strikethrough faint text; active = coral border + 3px coral-soft halo, expanded;
 * todo = empty ring, optional meta + "Continue ›" link.
 */
export function SetupChecklist({ title, items }: { title: string; items: ChecklistItem[] }) {
  const done = items.filter((i) => i.state === "done").length;
  return (
    <Card className="flex flex-col gap-4 px-6 pb-6 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="flex items-center gap-2.5 text-[13px] text-dim">
          {done} of {items.length} done
          <Progress className="w-40" value={(done / Math.max(1, items.length)) * 100} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((it) => {
          if (it.state === "active") {
            return (
              <div
                key={it.id}
                className="flex flex-col gap-3 rounded-inner border border-coral px-4 py-3.5 shadow-[0_0_0_3px_var(--color-coral-soft)]"
              >
                <div className="flex items-center gap-3">
                  <span className="size-[18px] shrink-0 rounded-full border-2 border-coral" />
                  <span className="text-sm font-medium">{it.title}</span>
                </div>
                {(it.description || it.action) && (
                  <div className="flex flex-col items-start gap-3 pl-[30px]">
                    {it.description && <p className="text-[13px] text-dim">{it.description}</p>}
                    {it.action}
                  </div>
                )}
              </div>
            );
          }
          const row = (
            <>
              {it.state === "done" ? (
                <Check className="size-[18px] shrink-0 text-success" strokeWidth={2.4} aria-hidden />
              ) : (
                <span className="size-[18px] shrink-0 rounded-full border-2 border-ring-idle" />
              )}
              <span className={cn("flex-1 text-sm", it.state === "done" && "text-faint line-through")}>
                {it.title}
              </span>
              {it.state === "todo" && it.meta && <span className="text-[13px] text-dim">{it.meta}</span>}
              {it.state === "todo" && it.href && (
                <span className="flex items-center gap-1 text-[13px] font-semibold">
                  {it.linkLabel ?? "Continue"} <ChevronRight className="size-3.5" />
                </span>
              )}
            </>
          );
          const cls = "flex h-12 items-center gap-3 rounded-inner border border-divider px-4 hover:bg-sidebar";
          return it.href && it.state === "todo" ? (
            <Link key={it.id} href={it.href} className={cls}>
              {row}
            </Link>
          ) : (
            <div key={it.id} className={cls}>
              {row}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
