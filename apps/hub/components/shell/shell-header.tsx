"use client";

import Link from "next/link";
import {
  ArrowLeft,
  GitBranch,
  LayoutGrid,
  PanelRight,
  Settings2,
  Table2,
  UploadCloud,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import { useRepo } from "@/contexts/repo-context";
import { roleAtLeast } from "@/lib/authz-shared";
import { usePublish } from "@/components/publish/publish-context";
import { User } from "@/components/user";
import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { InviteButton } from "@/components/shell/invite-button";

export type ShellMode = "canvas" | "settings";

/**
 * Docked top bar (white). Left: back arrow (home) + Canvas / CMS / Settings
 * toggle (settings = full access). Center: project name + branch. Right: user
 * menu, Invite (full access), Publish (content editor+).
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
  const { owner, repo, branch, cmsOverlay } = useCanvasEditor();
  const { draftCount, openPublishDialog } = usePublish();
  const { myRole } = useRepo();
  const canEdit = roleAtLeast(myRole ?? "full-access", "content-editor");
  const canManage = (myRole ?? "full-access") === "full-access";

  return (
    <header className="bg-background relative flex h-12 shrink-0 items-center gap-1 border-b px-2">
      {/* Left */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to projects"
          render={
            <Link href="/">
              <ArrowLeft className="size-4" />
            </Link>
          }
        />
        <div className="bg-border mx-1 h-5 w-px" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onModeChange("canvas")}
          data-active={mode === "canvas" && !cmsOverlay.open}
        >
          <LayoutGrid className="size-4" />
          <span className="max-md:hidden">Canvas</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenCms}
          data-active={cmsOverlay.open}
        >
          <Table2 className="size-4" />
          <span className="max-md:hidden">CMS</span>
        </Button>
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onModeChange("settings")}
            data-active={mode === "settings" && !cmsOverlay.open}
          >
            <Settings2 className="size-4" />
            <span className="max-md:hidden">Settings</span>
          </Button>
        )}
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
        {canEdit && (
          <Button size="sm" onClick={openPublishDialog}>
            <UploadCloud className="size-4" />
            Publish
            {draftCount > 0 && (
              <span className="bg-primary-foreground/20 ml-1 rounded-full px-1.5 text-xs tabular-nums">
                {draftCount}
              </span>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
