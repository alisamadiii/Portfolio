"use client";

import {
  MousePointerClick,
  Database,
  Search,
  UploadCloud,
} from "lucide-react";

/**
 * Right sidebar: a static, client-facing guide on how to update the site.
 * No backend — pure reference content the shell can collapse.
 */
const SECTIONS = [
  {
    icon: MousePointerClick,
    title: "Edit text & images",
    body: "Click any text on the page and start typing. Click an image to swap it from your media library. Changes show instantly in the preview.",
  },
  {
    icon: Database,
    title: "Manage lists (CMS)",
    body: "Open CMS from the top bar — or a collection in the left sidebar — to add, edit, reorder, or remove items like blog posts or team members.",
  },
  {
    icon: Search,
    title: "SEO & metadata",
    body: "Switch to Settings (top-left menu) to set your site title, description, favicon, social preview image, and per-page SEO.",
  },
  {
    icon: UploadCloud,
    title: "Publish your changes",
    body: "Edits are saved as a draft on this device until you click Publish. Publishing pushes everything live in one step — review the summary first.",
  },
];

export function DocsPanel() {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <h2 className="text-sm font-semibold">How to update your site</h2>
      <p className="text-muted-foreground mt-1 text-xs">
        A quick guide to editing and publishing.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="flex gap-3">
            <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
              <section.icon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium">{section.title}</h3>
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                {section.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
