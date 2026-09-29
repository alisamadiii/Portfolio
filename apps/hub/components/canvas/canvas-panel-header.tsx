"use client";

import { useEffect, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import {
  CanvasToolbar,
  type CanvasDevice,
} from "@/components/canvas/canvas-toolbar";
import { PageTree } from "@/components/shell/page-tree";
import {
  ChevronDown,
  FileText,
  GitBranch,
  MousePointerClick,
} from "@/components/icon";

/**
 * Slim bar at the top of the canvas panel: the pages popover (the old left
 * sidebar, now on demand), the device/URL/reload toolbar, and the element-pick
 * cursor toggle that drives the preview overlay from the hub side.
 */
export function CanvasPanelHeader({
  device,
  onDeviceChange,
  url,
  onReload,
  previewUrl,
}: {
  device: CanvasDevice;
  onDeviceChange: (device: CanvasDevice) => void;
  url: { host: string; path: string } | null;
  onReload: () => void;
  previewUrl?: string | null;
}) {
  const { selectedPath, session, repo, branch, pickModeActive, setPickMode } =
    useCanvasEditor();
  const [pagesOpen, setPagesOpen] = useState(false);

  // Picking a page closes the popover; opening a collection (CMS overlay) or
  // a "See all" dialog portals outside it, so those keep working.
  useEffect(() => {
    setPagesOpen(false);
  }, [selectedPath]);

  const sessionReady = session?.status === "ready";

  return (
    <div className="bg-background flex h-10 shrink-0 items-center gap-2 border-b px-2">
      <Popover open={pagesOpen} onOpenChange={setPagesOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1.5 px-2 text-xs font-semibold"
            >
              <FileText className="size-3.5" />
              Pages
              <ChevronDown className="size-3" />
            </Button>
          }
        />
        <PopoverContent
          align="start"
          sideOffset={6}
          className="h-[440px] w-72 overflow-hidden p-0"
        >
          <PageTree />
        </PopoverContent>
      </Popover>

      {/* Project identity (moved out of the top header) */}
      <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[12px]">
        <span className="text-foreground max-w-[160px] truncate font-medium">
          {repo}
        </span>
        <span className="text-muted-foreground/50">·</span>
        <GitBranch className="size-3.5 shrink-0" />
        <span className="truncate">{branch || "main"}</span>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        <CanvasToolbar
          device={device}
          onDeviceChange={onDeviceChange}
          url={url}
          onReload={onReload}
          previewUrl={previewUrl}
        />
        <button
          type="button"
          title="Select an element to edit"
          aria-label="Select an element to edit"
          aria-pressed={pickModeActive}
          disabled={!sessionReady}
          onClick={() => setPickMode(!pickModeActive)}
          className={cn(
            "flex h-7 w-[30px] items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            pickModeActive
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <MousePointerClick className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
