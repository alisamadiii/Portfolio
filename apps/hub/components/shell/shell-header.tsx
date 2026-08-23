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
  type LucideProps,
} from "@/components/icon";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";

import { useRepo } from "@/contexts/repo-context";
import { roleAtLeast } from "@/lib/authz-shared";
import { usePublish } from "@/components/publish/publish-context";
import { User } from "@/components/user";
import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { InviteButton } from "@/components/shell/invite-button";

export type ShellMode = "canvas" | "settings";

/**
 * Docked top bar (warm off-white). Left: back arrow (home) + agency brand mark
 * + a segmented Canvas / CMS / Settings toggle (settings = full access).
 * Center: project name + branch. Right: guide toggle, user menu, Invite (full
 * access), Publish (content editor+).
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

  const canvasActive = mode === "canvas" && !cmsOverlay.open;
  const cmsActive = cmsOverlay.open;
  const settingsActive = mode === "settings" && !cmsOverlay.open;

  return (
    <header className="bg-background relative flex h-11 shrink-0 items-center gap-2 border-b px-2.5">
      {/* Left */}
      <div className="flex items-center gap-1.5">
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
        <div className="flex items-center gap-2 px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/agency-icon.png"
            alt=""
            className="size-5 rounded-md"
            width={20}
            height={20}
          />
          <span className="text-[13px] font-bold tracking-tight">Canvas</span>
        </div>

        <div className="bg-border mx-0.5 h-5 w-px" />

        {/* Mode segmented control */}
        <div className="bg-muted flex items-center gap-0.5 rounded-lg p-0.5">
          <SegButton
            icon={LayoutGrid}
            label="Canvas"
            active={canvasActive}
            onClick={() => onModeChange("canvas")}
          />
          <SegButton
            icon={Table2}
            label="CMS"
            active={cmsActive}
            onClick={onOpenCms}
          />
          {canManage && (
            <SegButton
              icon={Settings2}
              label="Settings"
              active={settingsActive}
              onClick={() => onModeChange("settings")}
            />
          )}
        </div>
      </div>

      {/* Center */}
      <div className="text-muted-foreground pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-[12.5px]">
        <span className="text-foreground font-medium">{repo}</span>
        <span className="text-muted-foreground/50">·</span>
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

/** One pill in the mode segmented control. Active = raised card surface. */
function SegButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: (props: LucideProps) => React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className={cn(
        "flex h-[26px] items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-4" />
      <span className="max-md:hidden">{label}</span>
    </button>
  );
}
