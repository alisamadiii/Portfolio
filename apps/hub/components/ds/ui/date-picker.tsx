"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import { CalendarDays } from "lucide-react";

import { Calendar } from "@workspace/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Date field: DS input look, shadcn Calendar in a popover. Value is a
 * "yyyy-MM-dd" string, like a native date input.
 */
export function DatePicker({
  value,
  onChange,
  min,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Earliest pickable day, "yyyy-MM-dd". */
  min?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const minDate = min ? parse(min, "yyyy-MM-dd", new Date()) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-control border border-line-strong bg-surface px-2.5 text-left text-sm text-ink",
              "focus:border-coral focus:outline-none focus:ring-[3px] focus:ring-coral-soft",
              className
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-dim" />
            <span className={cn("truncate", !date && "text-faint")}>
              {date ? format(date, "EEE, MMM d, yyyy") : "Pick a date"}
            </span>
          </button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={(picked) => {
            if (!picked) return;
            onChange(format(picked, "yyyy-MM-dd"));
            setOpen(false);
          }}
          disabled={minDate ? { before: minDate } : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
