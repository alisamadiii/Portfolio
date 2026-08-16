"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";

import { useTRPC } from "@workspace/trpc/client";
import { useConfig } from "@/contexts/config-context";
import {
  draftKey,
  getDraft,
  saveDraftOrThrow,
  useDraftsStore,
  type Draft,
} from "@/lib/store/drafts";
import { applySeoAutofill, hideSeoFields } from "@/lib/seo-autofill";
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
 * The one slide-in entry editor — creating and editing collection entries
 * both use this Sheet (dialog/sheet split removed 2026-08-16).
 *
 * - `mode.kind === "edit"`: fetch the entry, overlay any local draft, save
 *   back to the drafts store in place; the sheet stays open.
 * - `mode.kind === "new"`: empty form (or an existing new-entry draft); the
 *   filename derives from the primary field on Save (slugified, deduped
 *   against `takenPaths`); the sheet closes on save.
 *
 * Collection entries hide their `seo` section — seo.title/seo.description
 * auto-fill from title + excerpt on save (see lib/seo-autofill.ts).
 */

export type EntrySheetDraft = { key: string; draft: Draft };

export type EntrySheetMode =
  | { kind: "edit"; path: string }
  | {
      kind: "new";
      /** Subfolder to create in; defaults to the collection root path. */
      parent?: string;
      /** Seed values for a fresh entry (e.g. manual-order position). */
      initialValues?: Record<string, unknown>;
      /** Existing new-entry draft to edit. */
      draft?: EntrySheetDraft;
      /** Paths already occupied by GitHub files or other drafts. */
      takenPaths: Set<string>;
    };

export function EntrySheet({
  open,
  onOpenChange,
  onOpenChangeComplete,
  schemaName,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires after the open/close animation settles (Base UI). */
  onOpenChangeComplete?: (open: boolean) => void;
  schemaName: string;
  mode: EntrySheetMode;
}) {
  const { config } = useConfig();
  const trpc = useTRPC();
  const deleteDraft = useDraftsStore((state) => state.deleteDraft);
  const [saving, setSaving] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const isEdit = mode.kind === "edit";
  const editPath = isEdit ? mode.path : "";
  const newDraft = !isEdit ? mode.draft : undefined;
  const formId = isEdit ? "cms-entry-sheet-edit" : "cms-entry-sheet-new";

  const schema = useMemo(
    () => (config ? getSchemaByName(config.object, schemaName) : null),
    [config, schemaName]
  );

  const entryFields = useMemo(() => {
    if (!schema?.fields || schema.fields.length === 0) return [];
    const fields = hideSeoFields(schema, schema.fields);
    if (schema.list === true) {
      return [
        {
          name: "listWrapper",
          label: false as const,
          type: "object",
          list: true,
          fields,
        },
      ];
    }
    return fields;
  }, [schema]);

  const entryQuery = useQuery(
    trpc.cms.entries.get.queryOptions(
      {
        owner: config?.owner ?? "",
        repo: config?.repo ?? "",
        branch: config?.branch ?? "",
        name: schemaName,
        path: editPath,
      },
      { enabled: Boolean(config && open && isEdit && editPath) }
    )
  );

  // The meta-only union member has no contentObject — narrow on it.
  const fetched =
    isEdit && entryQuery.data && "contentObject" in entryQuery.data
      ? entryQuery.data
      : null;

  const editDraft =
    isEdit && config
      ? getDraft(config.owner, config.repo, config.branch, editPath)
      : null;

  const contentObject = useMemo(() => {
    if (isEdit) {
      const values =
        (editDraft?.values as Record<string, unknown> | undefined) ??
        (fetched?.contentObject as Record<string, unknown> | undefined);
      if (!values) return null;
      return schema?.list === true
        ? { listWrapper: values }
        : (values as Record<string, unknown>);
    }
    if (newDraft) {
      return schema?.list === true
        ? { listWrapper: newDraft.draft.values }
        : (newDraft.draft.values as Record<string, unknown>);
    }
    return (mode.kind === "new" ? mode.initialValues : undefined) ?? {};
  }, [isEdit, editDraft, fetched, newDraft, mode, schema]);

  if (!config || !schema || entryFields.length === 0) return null;

  const handleSubmit = (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const unwrapped = applySeoAutofill(
        schema,
        (schema.list === true ? values.listWrapper : values) as Record<
          string,
          unknown
        >
      );

      const primaryField = getPrimaryField(schema);
      const rawTitle = primaryField
        ? safeAccess(values, primaryField)
        : undefined;
      const title = typeof rawTitle === "string" ? rawTitle : undefined;

      if (isEdit) {
        saveDraftOrThrow(
          draftKey(config.owner, config.repo, config.branch, editPath),
          {
            v: 1,
            path: editPath,
            schemaName,
            sha: editDraft?.sha ?? fetched?.sha ?? null,
            isNew: false,
            values: unwrapped,
            savedAt: Date.now(),
            title,
          }
        );
        toast.success("Draft saved on this device");
        setResetSignal((signal) => signal + 1);
        return;
      }

      // New entry: filename derives from the title — lowercased, slugified —
      // via the schema's filename pattern (or primary-field fallback).
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

      const takenPaths = mode.takenPaths;
      const basePath = normalizePath(mode.parent ?? schema.path);
      let savePath = joinPathSegments([basePath, generated]);

      // Keep the path unique against existing files and other drafts (the
      // draft being edited may keep its own path).
      if (savePath !== newDraft?.draft.path && takenPaths.has(savePath)) {
        const dot = generated.lastIndexOf(".");
        const stem = dot > 0 ? generated.slice(0, dot) : generated;
        const ext = dot > 0 ? generated.slice(dot) : "";
        let suffix = 1;
        while (
          takenPaths.has(
            (savePath = joinPathSegments([basePath, `${stem}-${suffix}${ext}`]))
          ) &&
          savePath !== newDraft?.draft.path
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
      if (newDraft && newDraft.draft.path !== savePath) {
        deleteDraft(newDraft.key);
      }

      toast.success("Draft saved on this device");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Could not save the draft.");
    } finally {
      setSaving(false);
    }
  };

  const loading = isEdit && entryQuery.isLoading && !contentObject;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <SheetContent
        side="right"
        className="z-50 w-full overflow-x-hidden overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>
            {isEdit
              ? schema.label || schema.name
              : newDraft
                ? "Edit draft"
                : "New entry"}
          </SheetTitle>
          <SheetDescription className="truncate">
            {isEdit ? editPath : "Saved on this device until you publish."}
          </SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading entry…
          </div>
        ) : contentObject ? (
          <>
            <div className="px-4 pb-24">
              <MediaLibraryProvider>
                <EntryForm
                  key={isEdit ? editPath : (newDraft?.key ?? "new")}
                  formId={formId}
                  fields={entryFields}
                  contentObject={contentObject}
                  onSubmit={handleSubmit}
                  resetSignal={resetSignal}
                />
              </MediaLibraryProvider>
            </div>
            <div className="bg-background sticky bottom-0 border-t p-4">
              <Button
                type="submit"
                form={formId}
                className="w-full"
                disabled={saving}
              >
                Save draft
              </Button>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground py-16 text-center text-sm">
            {isEdit && entryQuery.error instanceof Error
              ? entryQuery.error.message
              : "Could not load this entry."}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
