"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

import { EntryForm } from "@/components/entry/entry-form";
import {
  PAGE_SEO_FIELDS,
  type useSeoDraft,
} from "@/components/settings/use-seo-draft";
import type { CanvasPageInfo } from "@/components/canvas/canvas-editor-context";

/**
 * Settings › Page Settings › <page>. Per-page SEO (title, description, OG
 * image) plus a read-only URL. Writes into the page's slice of seo.json.
 */
export function PageSettingsPanel({
  page,
  seo,
}: {
  page: CanvasPageInfo;
  seo: ReturnType<typeof useSeoDraft>;
}) {
  const pageKey = page.entry ?? page.path;

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {page.path === "/" ? "Home" : page.title}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search and social metadata for this page.
        </p>
      </div>

      <section className="bg-background rounded-xl border">
        <div className="border-b px-6 py-4">
          <h2 className="text-sm font-semibold">Page Settings</h2>
        </div>
        <div className="grid gap-2 px-6 pt-5">
          <label className="text-sm font-medium">URL</label>
          <Input value={page.path} readOnly disabled />
        </div>
        <EntryForm
          key={pageKey}
          formId="page-seo-form"
          fields={PAGE_SEO_FIELDS}
          contentObject={seo.pageSeo(pageKey)}
          onSubmit={(values) => seo.savePage(pageKey, values)}
        />
        <div className="flex justify-end border-t px-6 py-3">
          <Button type="submit" form="page-seo-form">
            Save draft
          </Button>
        </div>
      </section>
    </div>
  );
}
