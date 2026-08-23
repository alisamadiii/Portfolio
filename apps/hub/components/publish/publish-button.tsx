"use client";

import { UploadCloud } from "@/components/icon";

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
