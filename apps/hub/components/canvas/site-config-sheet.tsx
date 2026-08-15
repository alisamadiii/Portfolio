"use client";

import { useCallback, useRef } from "react";

import type { Field } from "@workspace/cms-core/types/field";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";

import type { EntryRoute } from "@/lib/canvas-entries";

import { EntryForm } from "@/components/entry/entry-form";

const LIVE_THROTTLE_MS = 200;

/**
 * Global site settings (the `site` entry — name, phone, address…) edited from
 * the canvas. Reuses the standard EntryForm; while typing, values broadcast
 * into every mounted iframe so header/footer text updates live everywhere.
 */
export function SiteConfigSheet({
  open,
  onOpenChange,
  entry,
  values,
  onSave,
  onLiveChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: EntryRoute;
  values: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => void;
  onLiveChange: (values: Record<string, unknown>) => void;
}) {
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<Record<string, unknown> | null>(null);

  const handleValuesChange = useCallback(
    (next: Record<string, unknown>) => {
      latestRef.current = next;
      if (throttleRef.current) return;
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
        if (latestRef.current) onLiveChange(latestRef.current);
      }, LIVE_THROTTLE_MS);
    },
    [onLiveChange]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-x-hidden overflow-y-auto sm:max-w-xl"
        data-canvas-no-pan
      >
        <SheetHeader>
          <SheetTitle>{entry.schema.label || entry.schema.name}</SheetTitle>
          <SheetDescription>
            Used across the whole site — changes update every page.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-24">
          <EntryForm
            fields={(entry.schema.fields ?? []) as Field[]}
            contentObject={values}
            onSubmit={onSave}
            onValuesChange={handleValuesChange}
          />
        </div>
        <div className="bg-background sticky bottom-0 border-t p-4">
          {/* EntryForm renders <form id="entry-form"> without a submit button. */}
          <Button type="submit" form="entry-form" className="w-full">
            Save draft
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
