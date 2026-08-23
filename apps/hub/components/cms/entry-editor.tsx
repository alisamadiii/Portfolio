"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { useQuery } from "@tanstack/react-query";
import {
  generateFilename,
  getPrimaryField,
  getSchemaByName,
  safeAccess,
} from "@workspace/cms-core/schema";
import {
  joinPathSegments,
  normalizePath,
} from "@workspace/cms-core/utils/file";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { useTRPC } from "@workspace/trpc/client";

import { roleAtLeast } from "@/lib/authz-shared";
import { applySeoAutofill, hideSeoFields } from "@/lib/seo-autofill";
import {
  draftKey,
  getDraft,
  saveDraftOrThrow,
  useDraftsStore,
} from "@/lib/store/drafts";

import type { EntrySheetMode } from "@/components/cms/entry-sheet";
import { EntryForm } from "@/components/entry/entry-form";
import { Loader2, X } from "@/components/icon";

/**
 * Full inline entry editor — takes over the CMS content pane for creating and
 * editing collection entries (replaces the old slide-in Sheet). Same data +
 * draft-save logic as `EntrySheet`, rendered as a Framer-style back-bar +
 * scrolling form instead of a drawer.
 */
export function EntryEditor({
  schemaName,
  mode,
  schemaOverride,
  onClose,
}: {
  schemaName: string;
  mode: EntrySheetMode;
  /** CMS v2: synthetic schema from the cms.json collection declaration. */
  schemaOverride?: Record<string, any> | null;
  /** Back / after a new entry is saved. */
  onClose: () => void;
}) {
  const { config } = useConfig();
  const { myRole } = useRepo();
  const canEdit = roleAtLeast(myRole ?? "full-access", "content-editor");
  const trpc = useTRPC();
  const deleteDraft = useDraftsStore((state) => state.deleteDraft);
  const [saving, setSaving] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const isEdit = mode.kind === "edit";
  const editPath = isEdit ? mode.path : "";
  const newDraft = !isEdit ? mode.draft : undefined;
  const formId = isEdit ? "cms-entry-editor-edit" : "cms-entry-editor-new";

  const schema = useMemo(
    () =>
      schemaOverride ??
      (config ? getSchemaByName(config.object, schemaName) : null),
    [schemaOverride, config, schemaName]
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

  const legacyEntryQuery = useQuery(
    trpc.cms.entries.get.queryOptions(
      {
        owner: config?.owner ?? "",
        repo: config?.repo ?? "",
        branch: config?.branch ?? "",
        name: schemaName,
        path: editPath,
      },
      { enabled: Boolean(config && isEdit && editPath && !schemaOverride) }
    )
  );
  const rawEntryQuery = useQuery(
    trpc.cms.entries.getContent.queryOptions(
      {
        owner: config?.owner ?? "",
        repo: config?.repo ?? "",
        branch: config?.branch ?? "",
        path: editPath,
      },
      { enabled: Boolean(config && isEdit && editPath && schemaOverride) }
    )
  );
  const entryQuery = schemaOverride ? rawEntryQuery : legacyEntryQuery;

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
      return schema?.list === true ? { listWrapper: values } : values;
    }
    if (newDraft) {
      return schema?.list === true
        ? { listWrapper: newDraft.draft.values }
        : (newDraft.draft.values as Record<string, unknown>);
    }
    return (mode.kind === "new" ? mode.initialValues : undefined) ?? {};
  }, [isEdit, editDraft, fetched, newDraft, mode, schema]);

  if (!config || !schema || entryFields.length === 0) return null;

  const heading = isEdit
    ? schema.label || schema.name
    : newDraft
      ? "Edit draft"
      : "New entry";

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

      const pattern =
        schema.filename || `{primary}.${schema.extension || "md"}`;
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

      if (newDraft && newDraft.draft.path !== savePath) {
        deleteDraft(newDraft.key);
      }

      toast.success("Draft saved on this device");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Could not save the draft.");
    } finally {
      setSaving(false);
    }
  };

  const loading = isEdit && entryQuery.isLoading && !contentObject;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-start gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{heading}</p>
          <p className="text-muted-foreground truncate text-xs">
            {isEdit ? editPath : "Saved on this device until you publish."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-1.5 size-7 shrink-0"
          onClick={onClose}
          aria-label="Close editor"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Form */}
      <div className="scrollbar flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading entry…
          </div>
        ) : contentObject ? (
          <div className="">
            <EntryForm
              key={isEdit ? editPath : (newDraft?.key ?? "new")}
              formId={formId}
              fields={entryFields}
              contentObject={contentObject}
              onSubmit={handleSubmit}
              resetSignal={resetSignal}
            />
          </div>
        ) : (
          <div className="text-muted-foreground py-16 text-center text-sm">
            {isEdit && entryQuery.error instanceof Error
              ? entryQuery.error.message
              : "Could not load this entry."}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-background flex shrink-0 gap-2 border-t p-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          form={formId}
          className="flex-1"
          disabled={saving || !canEdit}
        >
          Save draft
        </Button>
      </div>
    </div>
  );
}
