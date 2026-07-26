"use client";

import { forwardRef, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

const INPUT_FORMAT = "yyyy-MM-dd";

const EditComponent = forwardRef(
  (props: any, ref: React.Ref<HTMLInputElement>) => {
    const { field, value, onChange } = props;
    const [open, setOpen] = useState(false);

    if (field?.options?.time) {
      return (
        <Input
          min={field?.options?.min ?? undefined}
          max={field?.options?.max ?? undefined}
          step={field?.options?.step ?? undefined}
          ref={ref}
          type="datetime-local"
          value={value}
          onChange={onChange}
          className={cn(
            "w-auto text-base",
            field?.readonly && "focus-visible:border-input focus-visible:ring-0"
          )}
          readOnly={field?.readonly}
        />
      );
    }

    const parsedValue = value
      ? parse(value, INPUT_FORMAT, new Date())
      : undefined;
    const selectedDate =
      parsedValue && isValid(parsedValue) ? parsedValue : undefined;

    const minDate = field?.options?.min
      ? parse(String(field.options.min), INPUT_FORMAT, new Date())
      : undefined;
    const maxDate = field?.options?.max
      ? parse(String(field.options.max), INPUT_FORMAT, new Date())
      : undefined;
    const disabledMatchers: Array<{ before: Date } | { after: Date }> = [];
    if (minDate && isValid(minDate)) disabledMatchers.push({ before: minDate });
    if (maxDate && isValid(maxDate)) disabledMatchers.push({ after: maxDate });

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={field?.readonly}
              className={cn(
                "w-48 justify-start text-left font-normal",
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
            disabled={
              disabledMatchers.length ? disabledMatchers : undefined
            }
            onSelect={(date) => {
              onChange(date ? format(date, INPUT_FORMAT) : "");
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    );
  }
);

export { EditComponent };
