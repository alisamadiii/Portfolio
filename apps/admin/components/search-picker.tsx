"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

export type PickerItem = {
  key: string;
  title: string;
  subtitle?: string;
  note?: string;
  selected?: boolean;
  onSelect: () => void;
};

/** A button that opens a searchable list in a popover; picking an item closes it. */
export function SearchPicker({
  id,
  label,
  placeholder,
  searchPlaceholder,
  search,
  onSearchChange,
  items,
  loading,
  empty,
  footer,
}: {
  id?: string;
  /** What's picked, or null to show the placeholder. */
  label: ReactNode | null;
  placeholder: string;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (value: string) => void;
  items: PickerItem[];
  loading?: boolean;
  empty: ReactNode;
  /** Extra action under the list, e.g. "use what I typed". Receives close(). */
  footer?: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", !label && "text-muted-foreground")}>
              {label ?? placeholder}
            </span>
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          </Button>
        }
      />
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-72 gap-2 p-2"
      >
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            autoFocus
            className="pl-8"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="space-y-1.5 p-1">
              <Skeleton className="h-9 w-full rounded" />
              <Skeleton className="h-9 w-full rounded" />
            </div>
          ) : items.length ? (
            items.map((item) => (
              <button
                key={item.key}
                type="button"
                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left"
                onClick={() => {
                  item.onSelect();
                  close();
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="text-muted-foreground truncate text-[12px]">
                      {item.subtitle}
                    </div>
                  )}
                </div>
                {item.note && (
                  <span className="text-muted-foreground shrink-0 text-[11.5px]">
                    {item.note}
                  </span>
                )}
                {item.selected && <Check className="size-4 shrink-0" />}
              </button>
            ))
          ) : (
            <div className="text-muted-foreground px-2 py-3 text-[13px]">
              {empty}
            </div>
          )}
        </div>
        {footer?.(close)}
      </PopoverContent>
    </Popover>
  );
}
