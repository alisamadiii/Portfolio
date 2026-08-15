"use client";

import type { Field } from "@workspace/cms-core/types/field";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { EntryForm } from "@/components/entry/entry-form";

/**
 * Per-page SEO editor opened from a canvas frame's title bar. Edits only the
 * entry's `seo` object; saving writes into the same working copy / draft as
 * inline canvas edits.
 */
export function SeoDialog({
  open,
  onOpenChange,
  pageTitle,
  fields,
  values,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageTitle: string;
  fields: Field[];
  values: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-xl" data-canvas-no-pan>
        <DialogHeader>
          <DialogTitle>SEO — {pageTitle}</DialogTitle>
          <DialogDescription>
            Search title and description for this page. Saved on this device
            until you publish.
          </DialogDescription>
        </DialogHeader>
        <div className="-mr-2 max-h-[65vh] overflow-y-auto pr-2">
          <EntryForm
            formId="canvas-seo-form"
            fields={fields}
            contentObject={values}
            onSubmit={(next) => {
              onSave(next);
              onOpenChange(false);
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="canvas-seo-form">
            Save draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
