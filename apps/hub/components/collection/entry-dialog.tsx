"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { useConfig } from "@/contexts/config-context";
import {
  draftKey,
  saveDraftOrThrow,
  useDraftsStore,
  type Draft,
} from "@/lib/store/drafts";
import {
  generateFilename,
  getPrimaryField,
  getSchemaByName,
  safeAccess,
} from "@workspace/cms-core/schema";
import { joinPathSegments, normalizePath } from "@workspace/cms-core/utils/file";

import { EntryForm } from "@/components/entry/entry-form";
import { MediaLibraryProvider } from "@/components/media/media-library-panel";

/**
 * Dialog-based entry creator/editor for new-entry drafts. No filename input —
 * the filename is derived from the entry's primary field (lowercased,
 * slugified by generateFilename) and only materializes as a real file at
 * publish time. Save writes a local draft.
 */

export type EntryDialogDraft = { key: string; draft: Draft };

export function EntryDialog({
  open,
  onOpenChange,
  schemaName,
  parent,
  initialValues,
  draft,
  takenPaths,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schemaName: string;
  /** Subfolder to create in; defaults to the collection root path. */
  parent?: string;
  /** Seed values for a fresh entry (e.g. manual-order position). */
  initialValues?: Record<string, unknown>;
  /** Existing new-entry draft to edit. */
  draft?: EntryDialogDraft;
  /** Paths already occupied by GitHub files or other drafts. */
  takenPaths: Set<string>;
}) {
  const { config } = useConfig();
  const deleteDraft = useDraftsStore((state) => state.deleteDraft);
  const [saving, setSaving] = useState(false);

  const schema = useMemo(
    () => (config ? getSchemaByName(config.object, schemaName) : null),
    [config, schemaName]
  );

  const entryFields = useMemo(() => {
    if (!schema?.fields || schema.fields.length === 0) return [];
    if (schema.list === true) {
      return [
        {
          name: "listWrapper",
          label: false as const,
          type: "object",
          list: true,
          fields: schema.fields,
        },
      ];
    }
    return schema.fields;
  }, [schema]);

  const contentObject = useMemo(() => {
    if (draft) {
      return schema?.list === true
        ? { listWrapper: draft.draft.values }
        : (draft.draft.values as Record<string, unknown>);
    }
    return initialValues ?? {};
  }, [draft, initialValues, schema]);

  if (!config || !schema || entryFields.length === 0) return null;

  const handleSubmit = (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const unwrapped = (
        schema.list === true ? values.listWrapper : values
      ) as Record<string, unknown>;

      const primaryField = getPrimaryField(schema);
      const rawTitle = primaryField
        ? safeAccess(values, primaryField)
        : undefined;
      const title = typeof rawTitle === "string" ? rawTitle : undefined;

      // Filename derives from the title — lowercased, slugified — via the
      // schema's filename pattern (or primary-field fallback).
      const pattern = schema.filename || `{primary}.${schema.extension || "md"}`;
      const generated = generateFilename(pattern, schema, values);
      if (!generated || generated.startsWith(".")) {
        toast.error(
          primaryField
            ? `Fill in "${primaryField}" first — it names the file.`
            : "Cannot generate a filename for this entry."
        );
        return;
      }

      const basePath = normalizePath(parent ?? schema.path);
      let savePath = joinPathSegments([basePath, generated]);

      // Keep the path unique against existing files and other drafts (the
      // draft being edited may keep its own path).
      if (savePath !== draft?.draft.path && takenPaths.has(savePath)) {
        const dot = generated.lastIndexOf(".");
        const stem = dot > 0 ? generated.slice(0, dot) : generated;
        const ext = dot > 0 ? generated.slice(dot) : "";
        let suffix = 1;
        while (
          takenPaths.has(
            (savePath = joinPathSegments([basePath, `${stem}-${suffix}${ext}`]))
          ) &&
          savePath !== draft?.draft.path
        ) {
          suffix += 1;
        }
      }

      const key = draftKey(config.owner, config.repo, config.branch, savePath);
      saveDraftOrThrow(key, {
        v: 1,
        path: savePath,
        schemaName,
        sha: null,
        isNew: true,
        values: unwrapped,
        savedAt: Date.now(),
        title,
      });

      // Title change moved the path — drop the old draft key.
      if (draft && draft.draft.path !== savePath) {
        deleteDraft(draft.key);
      }

      toast.success("Draft saved on this device");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Could not save the draft.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{draft ? "Edit draft" : "New entry"}</DialogTitle>
          <DialogDescription>
            Saved on this device until you publish.
          </DialogDescription>
        </DialogHeader>
        <div className="-mr-2 max-h-[65vh] overflow-y-auto pr-2">
          <MediaLibraryProvider>
            <EntryForm
              key={draft?.key ?? "new"}
              fields={entryFields}
              contentObject={contentObject}
              onSubmit={handleSubmit}
            />
          </MediaLibraryProvider>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={() => {
              const form =
                document.querySelector<HTMLFormElement>("form#entry-form");
              form?.requestSubmit();
            }}
          >
            Save draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
