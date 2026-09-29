"use client";

import { company } from "@workspace/ui/lib/company";

import {
  MousePointerClick,
  PaintbrushSparkle,
  UploadCloud,
  ArrowUpRight,
} from "@/components/icon";

import { DOCS_RESOURCES } from "@/lib/docs-links";

/**
 * Right sidebar: a static, client-facing guide on how to update the site with
 * the AI editor, plus links to the full docs on the agency site. No backend.
 */
const SECTIONS = [
  {
    icon: PaintbrushSparkle,
    title: "Chat with the AI",
    body: "Describe any change in the chat. The AI makes it and you see it in the live preview right away.",
  },
  {
    icon: MousePointerClick,
    title: "Point at an element",
    body: "Turn on the element picker in the canvas bar, click something in the preview, then your next message edits exactly that.",
  },
  {
    icon: UploadCloud,
    title: "Publish your changes",
    body: "When the preview looks right, click Publish. Your changes go live on your real site in one step.",
  },
];

export function DocsPanel() {
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
    </div>
  );
}
