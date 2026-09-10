"use client";

import { forwardRef, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "@/components/icon";

import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Datetime field — shadcn Calendar (date) + a time input, bound to a single
 * `YYYY-MM-DDTHH:MM` string.
 *
 * Wall time, no timezone: the value is parsed and re-emitted by pure string
 * splitting/formatting — never through `new Date(value)` — so a Portland-local
 * "2026-08-29T13:00" round-trips byte-for-byte and never shifts a day (unquoted
 * dates parse as UTC midnight; that's the bug this avoids).
 */
const DATE_FORMAT = "yyyy-MM-dd";

function splitValue(value: unknown): { date: string; time: string } {
  const raw = typeof value === "string" ? value : "";
  const [date = "", time = ""] = raw.split("T");
  return { date, time: time.slice(0, 5) }; // HH:MM (drop any seconds/zone)
}

const EditComponent = forwardRef((props: any, _ref: React.Ref<HTMLInputElement>) => {
  const { field, value, onChange } = props;
  const [open, setOpen] = useState(false);
  const { date, time } = splitValue(value);

  const parsed = date ? parse(date, DATE_FORMAT, new Date()) : undefined;
  const selectedDate = parsed && isValid(parsed) ? parsed : undefined;

  // Re-emit as a plain string. Only write a datetime once a date is picked; an
  // empty date clears the field (a lone time can't form a valid value).
  const emit = (nextDate: string, nextTime: string) => {
    if (!nextDate) return onChange("");
    onChange(`${nextDate}T${nextTime || "00:00"}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={field?.readonly}
              className={cn(
                "bg-card w-48 justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="size-4" />
              {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={(picked) => {
              emit(picked ? format(picked, DATE_FORMAT) : "", time);
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={time}
        disabled={field?.readonly || !date}
        onChange={(event) => emit(date, event.target.value)}
        className="bg-card w-32"
      />
    </div>
  );
});

export { EditComponent };
