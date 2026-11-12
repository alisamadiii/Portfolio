import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { BUSINESS_STEPS } from "@/components/agency/business-info-config";

/** Row of 32px pills. Current = ink fill, white text, coral number. Done = green check number. Short rule between step 5 and 6 (group break). */
export function StepPills({
  base,
  current,
  done = [],
}: {
  base: string;
  current: number;
  done?: number[];
}) {
  return (
    <nav aria-label="Business info steps" className="flex flex-wrap items-center gap-1.5">
      {BUSINESS_STEPS.map((s, i) => {
        const n = i + 1;
        const active = n === current;
        const isDone = done.includes(n);
        const groupBreak = i > 0 && BUSINESS_STEPS[i - 1]?.part !== s.part;
        return (
          <span key={s.key} className="contents">
            {groupBreak && <span className="h-px w-4 bg-ring-idle" aria-hidden />}
            <Link
              href={`${base}/${s.key}`}
              aria-current={active ? "step" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border pl-1.5 pr-3 text-[13px]",
                active
                  ? "border-ink bg-ink font-medium text-white"
                  : "border-line bg-surface text-ink-3 hover:border-ring-idle hover:text-ink"
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px] font-semibold",
                  active
                    ? "bg-coral text-ink"
                    : isDone
                      ? "bg-success-soft text-success-text"
                      : "bg-tile text-ink-3"
                )}
              >
                {isDone && !active ? <Check className="size-3" strokeWidth={3} /> : n}
              </span>
              {s.shortLabel}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
