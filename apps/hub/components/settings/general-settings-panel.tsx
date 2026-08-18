"use client";

import { Button } from "@workspace/ui/components/button";

import { EntryForm } from "@/components/entry/entry-form";
import {
  SITE_SEO_FIELDS,
  type useSeoDraft,
} from "@/components/settings/use-seo-draft";

/**
 * Settings › General. Site-level SEO defaults: title, description, favicon,
 * social/OG image, apple touch icon, Google Analytics.
 */
export function GeneralSettingsPanel({
  seo,
}: {
  seo: ReturnType<typeof useSeoDraft>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">General</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search and social metadata for your whole site.
        </p>
      </div>

      <section className="bg-background rounded-xl border">
        <div className="border-b px-6 py-4">
          <h2 className="text-sm font-semibold">Site SEO</h2>
          <p className="text-muted-foreground text-xs">
            Defaults for search engines and social sharing.
          </p>
        </div>
        <EntryForm
          formId="site-seo-form"
          fields={SITE_SEO_FIELDS}
          contentObject={seo.site}
          onSubmit={seo.saveSite}
        />
        <div className="flex justify-end border-t px-6 py-3">
          <Button type="submit" form="site-seo-form">
            Save draft
          </Button>
        </div>
      </section>
    </div>
  );
}
