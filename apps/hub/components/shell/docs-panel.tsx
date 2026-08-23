"use client";

import {
  MousePointerClick,
  Database,
  Search,
  UploadCloud,
} from "@/components/icon";

import { usePublish } from "@/components/publish/publish-context";

/**
 * Right sidebar: a static, client-facing guide on how to update the site, with
 * a live "unpublished changes" banner when drafts exist. No backend — pure
 * reference content the shell can collapse.
 */
const SECTIONS = [
  {
    icon: MousePointerClick,
    title: "Edit text & images",
    body: "Click anything in the preview to select it, then edit it right there. Changes show instantly.",
  },
  {
    icon: Database,
    title: "Manage lists (CMS)",
    body: "Open CMS from the top bar — or a collection in the left sidebar — to add, edit, or remove items like stories or team members.",
  },
  {
    icon: Search,
    title: "SEO & metadata",
    body: "Switch to Settings to set your site title, description, favicon, social preview image, and per-page SEO.",
  },
  {
    icon: UploadCloud,
    title: "Publish your changes",
    body: "Edits are drafts on this device until you click Publish — review everything, then it all goes live at once.",
  },
];

export function DocsPanel() {
  const { draftCount, openPublishDialog } = usePublish();

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3.5">
      <h2 className="text-[13.5px] font-bold">How to update your site</h2>
      <p className="text-muted-foreground mt-0.5 text-[11.5px]">
        A quick guide to editing and publishing.
      </p>
      <div className="mt-4 flex flex-col gap-3.5">
        {SECTIONS.map((section) => (
          <div key={section.title} className="flex gap-2.5">
            <div className="bg-primary/10 text-primary flex size-[26px] shrink-0 items-center justify-center rounded-md">
              <section.icon className="size-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold">{section.title}</h3>
              <p className="text-muted-foreground mt-0.5 text-[11.5px] leading-relaxed">
                {section.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {draftCount > 0 && (
        <div className="border-draft/50 bg-draft-bg mt-4 rounded-lg border p-2.5">
          <div className="text-draft-fg text-[11.5px] font-semibold">
            {draftCount} unpublished{" "}
            {draftCount === 1 ? "change" : "changes"} on this device
          </div>
          <button
            type="button"
            onClick={openPublishDialog}
            className="text-primary mt-0.5 text-[11.5px] font-semibold underline underline-offset-2"
          >
            Review &amp; publish →
          </button>
        </div>
      )}
    </div>
  );
}
