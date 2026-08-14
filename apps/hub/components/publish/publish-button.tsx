"use client";

import { UploadCloud } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import { usePublish } from "@/components/publish/publish-context";

/**
 * Primary publish action with a draft-count badge, rendered next to Save in
 * the entry header. Hidden while there are no drafts.
 */
export function PublishButton() {
  const { draftCount, openPublishDialog } = usePublish();

  if (draftCount === 0) return null;

  return (
    <Button onClick={openPublishDialog} aria-label="Publish">
      <UploadCloud className="size-4 sm:hidden" />
      <span className="hidden sm:inline">Publish</span>
      <Badge
        variant="secondary"
        className="h-4 min-w-4 px-1 tabular-nums"
      >
        {draftCount}
      </Badge>
    </Button>
  );
}

/**
 * Compact sidebar-footer affordance ("N drafts — Publish") so publishing is
 * reachable from any page. Hidden while there are no drafts.
 */
export function SidebarPublishButton() {
  const { draftCount, openPublishDialog } = usePublish();

  if (draftCount === 0) return null;

  return (
    <button
      type="button"
      onClick={openPublishDialog}
      className="bg-sidebar-accent/50 hover:bg-sidebar-accent hover:text-foreground flex h-9 w-full items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors"
    >
      <UploadCloud className="size-4 shrink-0" />
      <span className="flex-1 truncate text-left">
        {draftCount} {draftCount === 1 ? "draft" : "drafts"} — Publish
      </span>
    </button>
  );
}
