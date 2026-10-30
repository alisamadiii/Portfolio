"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { repoPath } from "@/lib/paths";
import { useRepo } from "@/hooks/use-repo";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { SessionActions } from "@/components/canvas/session-actions";
import {
  ArrowLeft,
  Info,
  LayoutGrid,
  Settings,
  Settings2,
  type LucideProps,
} from "@/components/icon";
import { AdminViewSwitch } from "@/components/shell/admin-view-switch";
import { AiIntroDialog } from "@/components/shell/ai-intro-dialog";
import { InviteButton } from "@/components/shell/invite-button";
import { User } from "@/components/user";

export type ShellMode = "canvas" | "settings";

/**
 * Docked top bar (warm off-white). Left: back arrow (home) + agency brand
 * mark. The Canvas / Settings tabs float at the canvas panel's left edge —
 * `--chat-w` (set by the resizable split) keeps them aligned at any splitter
 * position. Center: project name + branch. Right: guide, project settings
 * (website, full access), user menu, Invite
 * (full access), Publish (content editor+). Images are attached in the chat.
 */
export function ShellHeader({
  mode,
  onModeChange,
  onToggleDocs,
  onOpenProjectSettings,
  chatWidth,
  inAgency,
}: {
  mode: ShellMode;
  onModeChange: (mode: ShellMode) => void;
  onToggleDocs: () => void;
  /** Opens the website project settings dialog (website URL). */
  onOpenProjectSettings: () => void;
  /** Chat-panel width (%) — offsets the tabs to the canvas panel's left edge. */
  chatWidth: number;
  /** Agency project: no Settings tab (site settings live in the agency
   *  sidebar) and Leave goes back to the project, not the projects list. */
  inAgency: boolean;
}) {
  const router = useRouter();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const { projectId } = useCanvasEditor();
  const { myRole } = useRepo();
  const canManage = (myRole ?? "full-access") === "full-access";
  const leaveHref = inAgency ? repoPath(projectId) : "/";

  const canvasActive = mode === "canvas";
  const settingsActive = mode === "settings";

  return (
    <header className="bg-background relative flex h-11 shrink-0 items-center gap-2 border-b px-2.5">
      {/* Left */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={inAgency ? "Back to project" : "Back to projects"}
          onClick={() => setLeaveOpen(true)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave the editor?</AlertDialogTitle>
              <AlertDialogDescription>
                {inAgency
                  ? "You'll return to this project."
                  : "You'll return to your projects list."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay</AlertDialogCancel>
              <AlertDialogAction onClick={() => router.push(leaveHref)}>
                Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
      </div>

      {/* Mode tabs — pinned to the canvas panel's left edge. `--chat-w` is
          the live chat-panel width (%) set by the resizable split, so the
          tabs stay flush with the canvas at any splitter position. Agency
          projects have only the canvas, so no tabs. */}
      {!inAgency && (
        <div
          className="bg-muted absolute flex items-center gap-0.5 rounded-lg p-0.5"
          style={{ left: `calc(${chatWidth}% + 12px)` }}
        >
          <SegButton
            icon={LayoutGrid}
            label="Canvas"
            active={canvasActive}
            onClick={() => onModeChange("canvas")}
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
      )}

      {/* Right */}
      <div className="ml-auto flex items-center gap-1.5">
        <AdminViewSwitch
          projectId={projectId}
          current={inAgency ? "agency" : "website"}
        />
        <AiIntroDialog />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleDocs}
          aria-label="Open guide"
          className="text-muted-foreground hover:text-foreground"
        >
          <Info className="size-5" />
        </Button>
        {!inAgency && canManage && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenProjectSettings}
            aria-label="Project settings"
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="size-5" />
          </Button>
        )}
        <User align="end" />
        <InviteButton projectId={projectId} />
        <SessionActions />
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
        "relative flex h-[26px] items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold transition-colors",
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
