"use client";

import type { Field } from "@workspace/cms-core/types/field";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { EntryForm } from "@/components/entry/entry-form";
import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";

/**
 * Settings › Variables. The global values (`variables.json`) reused on every
 * page — company name, logo, contact details, socials. Editing one updates it
 * everywhere it's bound.
 */
export function VariablesPanel() {
  const { globalEntry, getGlobalValues, handleSiteConfigSave, copiesVersion } =
    useCanvasEditor();
  void copiesVersion; // re-read values after edits elsewhere

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Variables</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Values reused across every page — edit once, updates everywhere.
        </p>
      </div>

      {globalEntry ? (
        <section className="bg-card rounded-xl border shadow-sm">
          <EntryForm
            formId="variables-form"
            variant="settings"
            fields={(globalEntry.schema.fields ?? []) as Field[]}
            contentObject={getGlobalValues() ?? {}}
            onSubmit={handleSiteConfigSave}
          />
          <div className="flex justify-start border-t px-6 py-3">
            <Button type="submit" form="variables-form">
              Save draft
            </Button>
          </div>
        </section>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No variables yet</EmptyTitle>
            <EmptyDescription>
              This site has no global values file. Add
              &nbsp;<code>src/data/variables.json</code>&nbsp; to define shared
              values like the company name, logo, and contact details.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
