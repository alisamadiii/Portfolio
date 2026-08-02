"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

// Re-exported so consumers don't need react-day-picker as a direct dep.
export type { DateRange };

const label = (value: DateRange | undefined, placeholder: string) => {
  if (!value?.from) return placeholder;
  const from = format(value.from, "MMM d, yyyy");
  return value.to ? `${from} – ${format(value.to, "MMM d, yyyy")}` : from;
};

export function DateRangePicker({
  value,
  onChange,
  placeholder = "All time",
  className,
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn("gap-2 font-medium", className)}
          />
        }
      >
        <CalendarIcon className="size-4" />
        <span className={cn(!value?.from && "text-muted-foreground")}>
          {label(value, placeholder)}
        </span>
        <ChevronDown className="text-muted-foreground size-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
        />
        <div className="flex justify-end border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!value}
            onClick={() => onChange(undefined)}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
