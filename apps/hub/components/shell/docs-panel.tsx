"use client";

import { company } from "@workspace/ui/lib/company";

import {
  MousePointerClick,
  Sparkles,
  PaintbrushSparkle,
  Database,
  Search,
  UploadCloud,
  Rocket,
  ArrowUpRight,
} from "@/components/icon";

import { usePublish } from "@/components/publish/publish-context";
import { DOCS_RESOURCES } from "@/lib/docs-links";

/**
 * Right sidebar: a static, client-facing guide on how to update the site —
 * quick how-to items, links to the full docs on the agency site, and a live
 * "unpublished changes" banner when drafts exist. No backend.
 */
const SECTIONS = [
  {
    icon: MousePointerClick,
    title: "Edit text & images",
    body: "Click anything in the preview to select it, then edit it right there. Changes show instantly.",
  },
  {
    icon: Sparkles,
    title: "Ask AI (quick edits)",
    body: "Click an element and describe the change. AI applies it in the background — if it can't, you get an email explaining why.",
  },
  {
    icon: PaintbrushSparkle,
    title: "AI chat session",
    body: "For bigger changes, start a session: you get a preview URL where every change shows live, so you publish with confidence.",
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
  {
    icon: Rocket,
    title: "Deployments",
    body: "Every background AI edit is tracked in the Deployments tab — what was asked, what changed, and the resulting publish.",
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

      <div className="mt-5 border-t pt-4">
        <h2 className="text-[13.5px] font-bold">Learn more</h2>
        <p className="text-muted-foreground mt-0.5 text-[11.5px]">
          Full guides with screenshots and videos.
        </p>
        <div className="mt-2.5 flex flex-col">
          {DOCS_RESOURCES.map((resource) => (
            <a
              key={resource.href}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group hover:bg-muted -mx-1.5 flex items-center justify-between gap-2 rounded-md px-1.5 py-[7px]"
            >
              <span className="text-xs font-medium">{resource.title}</span>
              <ArrowUpRight className="text-muted-foreground group-hover:text-foreground size-3.5 shrink-0" />
            </a>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t pt-4">
        <h3 className="text-xs font-semibold">Need help?</h3>
        <p className="text-muted-foreground mt-0.5 text-[11.5px] leading-relaxed">
          Email{" "}
          <a
            href={`mailto:${company.agencyEmail}`}
            className="text-primary font-medium underline underline-offset-2"
          >
            {company.agencyEmail}
          </a>{" "}
          — a real person answers.
        </p>
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
