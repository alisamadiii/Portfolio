"use client";

import { useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import type { GroupMember } from "@/lib/bridge-messages";

import { TextField } from "@/components/ui/form-fields";
import { Image as ImageIcon, Trash2 } from "@/components/icon";
import { useMediaLibrary } from "@/components/media/media-library-context";
import { Thumbnail } from "@/components/thumbnail";

export type GroupEditorFieldRow = {
  path: string;
  kind: GroupMember["kind"];
  label: string;
  value: string;
};
export type GroupEditorSection = {
  title?: string;
  rows: GroupEditorFieldRow[];
  /** Array index this section represents — enables move/remove controls. */
  itemIndex?: number;
};

/**
 * Modal editor for a CMS group: lists every editable field of the clicked
 * cluster, grouped by array item. Text/link rows commit on Save; an image row
 * opens the global media dialog. All fields for a group are edited here — the
 * group's children are never individually editable inline.
 */
export function GroupEditorDialog({
  open,
  sections,
  onCommit,
  onClose,
  onStructuralOp,
}: {
  open: boolean;
  sections: GroupEditorSection[];
  onCommit: (path: string, value: string) => void;
  onClose: () => void;
  /** Add/remove/move an array item — applies immediately and closes. */
  onStructuralOp?: (op: "add" | "remove" | "move", index: number, toIndex?: number) => void;
}) {
  const { open: openMediaLibrary } = useMediaLibrary();
  const hasRows = sections.some((section) => section.rows.length > 0);
  // Buffer every edit locally — NOTHING is persisted or pushed to the iframe
  // until Save. Keyed by field path. Seeded once on mount (the dialog remounts
  // per group via its React key), so re-renders don't clobber in-progress edits.
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const section of sections)
      for (const row of section.rows) seed[row.path] = row.value;
    return seed;
  });
  const setField = (path: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [path]: value }));
  const dirty = sections.some((section) =>
    section.rows.some((row) => (drafts[row.path] ?? "") !== row.value)
  );
  const save = () => {
    for (const section of sections)
      for (const row of section.rows) {
        const next = drafts[row.path] ?? "";
        if (next !== row.value) onCommit(row.path, next);
      }
    onClose();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto bg-white p-0 sm:max-w-md">
        <DialogHeader className="p-6 pb-1">
          <DialogTitle>Edit content</DialogTitle>
        </DialogHeader>
        {hasRows ? (
          <div className="flex flex-col gap-2 p-2">
            {sections.map((section, index) => (
              <div
                key={section.title ?? index}
                className="bg-muted/50 flex flex-col gap-3 rounded-lg border p-4"
              >
                {(section.title || section.itemIndex !== undefined) && (
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium">
                      {section.title ?? `Item ${(section.itemIndex ?? 0) + 1}`}
                    </span>
                    {onStructuralOp && section.itemIndex !== undefined && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="Move up"
                          disabled={section.itemIndex === 0}
                          onClick={() =>
                            onStructuralOp("move", section.itemIndex!, section.itemIndex! - 1)
                          }
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="Move down"
                          disabled={
                            section.itemIndex ===
                            Math.max(
                              ...sections
                                .map((s) => s.itemIndex)
                                .filter((i): i is number => i !== undefined)
                            )
                          }
                          onClick={() =>
                            onStructuralOp("move", section.itemIndex!, section.itemIndex! + 1)
                          }
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="Remove item"
                          className="text-destructive"
                          onClick={() => onStructuralOp("remove", section.itemIndex!)}
                        >
                          ✕
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {section.rows.map((row) => {
                  const current = drafts[row.path] ?? "";
                  return row.kind === "media" ? (
                    <div key={row.path} className="flex flex-col gap-1.5">
                      <span className="text-muted-foreground text-xs">
                        {row.label}
                      </span>
                      {current && (
                        <Thumbnail
                          path={current}
                          className="aspect-video w-full max-w-[220px] rounded-md border"
                          imgClassName="object-contain"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openMediaLibrary({
                              title: current ? "Replace image" : "Add image",
                              onInsert: (urls) => {
                                const url = urls[0];
                                if (url) setField(row.path, url);
                              },
                            })
                          }
                        >
                          <ImageIcon className="size-4" />
                          {current !== row.value
                            ? "Image selected — Save to apply"
                            : current
                              ? "Replace image"
                              : "Add image"}
                        </Button>
                        {current && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setField(row.path, "")}
                          >
                            <Trash2 className="size-4" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <TextField
                      key={row.path}
                      label={row.label}
                      value={drafts[row.path] ?? ""}
                      size="small"
                      fullWidth
                      onChange={(event) =>
                        setField(row.path, event.target.value)
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No editable fields in this section.
          </p>
        )}
        <DialogFooter className="bg-card sticky bottom-0 mx-0">
          {onStructuralOp &&
            sections.some((section) => section.itemIndex !== undefined) && (
              <Button
                type="button"
                variant="outline"
                className="mr-auto"
                onClick={() => {
                  const last = Math.max(
                    ...sections
                      .map((s) => s.itemIndex)
                      .filter((i): i is number => i !== undefined)
                  );
                  onStructuralOp("add", last);
                }}
              >
                + Add item
              </Button>
            )}
          <DialogClose render={<Button variant="secondary">Cancel</Button>} />
          <Button type="button" disabled={!dirty} onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
