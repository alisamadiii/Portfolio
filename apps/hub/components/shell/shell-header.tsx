"use client";

import {
  GitBranch,
  PanelRight,
  Settings2,
  Table2,
  UploadCloud,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import { usePublish } from "@/components/publish/publish-context";
import { User } from "@/components/user";
import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { ModeSwitcher, type ShellMode } from "@/components/shell/mode-switcher";
import { InviteButton } from "@/components/shell/invite-button";

/**
 * Docked top bar (white). Left: mode switcher (logo) + CMS + Settings. Center:
 * project name + branch. Right: user menu, admin-only Invite, Publish.
 */
export function ShellHeader({
  mode,
  onModeChange,
  onOpenCms,
  onToggleDocs,
}: {
  mode: ShellMode;
  onModeChange: (mode: ShellMode) => void;
  onOpenCms: () => void;
  onToggleDocs: () => void;
}) {
  const { owner, repo, branch } = useCanvasEditor();
  const { draftCount, openPublishDialog } = usePublish();

  return (
    <header className="bg-background relative flex h-12 shrink-0 items-center gap-1 border-b px-2">
      {/* Left */}
      <div className="flex items-center gap-1">
        <ModeSwitcher mode={mode} onModeChange={onModeChange} />
        <div className="bg-border mx-1 h-5 w-px" />
        <Button variant="ghost" size="sm" onClick={onOpenCms}>
          <Table2 className="size-4" />
          <span className="max-md:hidden">CMS</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onModeChange("settings")}
          data-active={mode === "settings"}
        >
          <Settings2 className="size-4" />
          <span className="max-md:hidden">Settings</span>
        </Button>
      </div>

      {/* Center */}
      <div className="text-muted-foreground pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-sm">
        <span className="text-foreground font-medium">{repo}</span>
        <span className="text-muted-foreground/60">·</span>
        <GitBranch className="size-3.5" />
        <span>{branch || "main"}</span>
      </div>

      {/* Right */}
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleDocs}
          aria-label="Toggle guide"
        >
          <PanelRight className="size-4" />
        </Button>
        <User align="end" />
        <InviteButton owner={owner} repo={repo} />
        <Button size="sm" onClick={openPublishDialog}>
          <UploadCloud className="size-4" />
          Publish
          {draftCount > 0 && (
            <span className="bg-primary-foreground/20 ml-1 rounded-full px-1.5 text-xs tabular-nums">
              {draftCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
