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
import { draftKey, getDraft, saveDraftOrThrow } from "@/lib/store/drafts";
import {
  getPrimaryField,
  getSchemaByName,
  safeAccess,
} from "@workspace/cms-core/schema";

import { EntryForm } from "@/components/entry/entry-form";
import { MediaLibraryProvider } from "@/components/media/media-library-panel";

/**
 * Slide-in entry editor for the CMS overlay (Framer-style): edits an existing
 * collection entry in place — fetch, overlay any local draft, save back to the
 * drafts store. New-entry drafts keep using EntryDialog.
 */
export function EntryEditPanel({
  open,
  onOpenChange,
  schemaName,
  path,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schemaName: string;
  path: string;
}) {
  const { config } = useConfig();
  const trpc = useTRPC();
  const [saving, setSaving] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

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

  const entryQuery = useQuery(
    trpc.cms.entries.get.queryOptions(
      {
        owner: config?.owner ?? "",
        repo: config?.repo ?? "",
        branch: config?.branch ?? "",
        name: schemaName,
        path,
      },
      { enabled: Boolean(config && open && path) }
    )
  );

  // The meta-only union member has no contentObject — narrow on it.
  const fetched =
    entryQuery.data && "contentObject" in entryQuery.data
      ? entryQuery.data
      : null;

  const draft = config
    ? getDraft(config.owner, config.repo, config.branch, path)
    : null;

  const contentObject = useMemo(() => {
    const values =
      (draft?.values as Record<string, unknown> | undefined) ??
      (fetched?.contentObject as Record<string, unknown> | undefined);
    if (!values) return null;
    return schema?.list === true
      ? { listWrapper: values }
      : (values as Record<string, unknown>);
  }, [draft, fetched, schema]);

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

      saveDraftOrThrow(
        draftKey(config.owner, config.repo, config.branch, path),
        {
          v: 1,
          path,
          schemaName,
          sha: draft?.sha ?? fetched?.sha ?? null,
          isNew: false,
          values: unwrapped,
          savedAt: Date.now(),
          title,
        }
      );

      toast.success("Draft saved on this device");
      setResetSignal((signal) => signal + 1);
    } catch (error: any) {
      toast.error(error?.message || "Could not save the draft.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="z-50 w-full overflow-x-hidden overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{schema.label || schema.name}</SheetTitle>
          <SheetDescription className="truncate">{path}</SheetDescription>
        </SheetHeader>
        {entryQuery.isLoading && !contentObject ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading entry…
          </div>
        ) : contentObject ? (
          <>
            <div className="px-4 pb-24">
              <MediaLibraryProvider>
                <EntryForm
                  key={path}
                  formId="cms-entry-edit-form"
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
                form="cms-entry-edit-form"
                className="w-full"
                disabled={saving}
              >
                Save draft
              </Button>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground py-16 text-center text-sm">
            {entryQuery.error instanceof Error
              ? entryQuery.error.message
              : "Could not load this entry."}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
