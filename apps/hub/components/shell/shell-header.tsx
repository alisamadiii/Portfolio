"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRepo } from "@/contexts/repo-context";

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

import { roleAtLeast } from "@/lib/authz-shared";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import {
  ArrowLeft,
  Info,
  LayoutGrid,
  Settings2,
  Upload,
  type LucideProps,
} from "@/components/icon";
import { useMediaLibrary } from "@/components/media/media-library-context";
import { toast } from "sonner";
import { SessionActions } from "@/components/canvas/session-actions";
import { AiIntroDialog } from "@/components/shell/ai-intro-dialog";
import { InviteButton } from "@/components/shell/invite-button";
import { User } from "@/components/user";

export type ShellMode = "canvas" | "settings";

/**
 * Docked top bar (warm off-white). Left: back arrow (home) + agency brand
 * mark. The Canvas / Settings tabs float at the canvas panel's left edge —
 * `--chat-w` (set by the resizable split) keeps them aligned at any splitter
 * position. Center: project name + branch. Right: media upload, guide, user
 * menu, Invite (full access), Publish (content editor+).
 */
export function ShellHeader({
  mode,
  onModeChange,
  onToggleDocs,
  chatWidth,
}: {
  mode: ShellMode;
  onModeChange: (mode: ShellMode) => void;
  onToggleDocs: () => void;
  /** Chat-panel width (%) — offsets the tabs to the canvas panel's left edge. */
  chatWidth: number;
}) {
  const router = useRouter();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const { repoId } = useCanvasEditor();
  const { myRole } = useRepo();
  const mediaLibrary = useMediaLibrary();
  const canEdit = roleAtLeast(myRole ?? "full-access", "content-editor");
  const canManage = (myRole ?? "full-access") === "full-access";

  const canvasActive = mode === "canvas";
  const settingsActive = mode === "settings";

  return (
    <header className="bg-background relative flex h-11 shrink-0 items-center gap-2 border-b px-2.5">
      {/* Left */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to projects"
          onClick={() => setLeaveOpen(true)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave the editor?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll return to your projects list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay</AlertDialogCancel>
              <AlertDialogAction onClick={() => router.push("/")}>
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
          tabs stay flush with the canvas at any splitter position. */}
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

      {/* Right */}
      <div className="ml-auto flex items-center gap-1.5">
        <AiIntroDialog />
        {mediaLibrary.isAvailable && canEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Upload media"
            onClick={() =>
              mediaLibrary.open({
                title: "Upload media",
                onInsert: (urls) => {
                  // Uploading is the point; inserting just hands the URL back
                  // for pasting into an AI request.
                  if (!urls.length) return;
                  navigator.clipboard
                    ?.writeText(urls.join("\n"))
                    .then(() => toast.success("Image URL copied"))
                    .catch(() => {});
                },
              })
            }
            className="text-muted-foreground hover:text-foreground"
          >
            <Upload className="size-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleDocs}
          aria-label="Open guide"
          className="text-muted-foreground hover:text-foreground"
        >
          <Info className="size-5" />
        </Button>
        <User align="end" />
        <InviteButton repoId={repoId} />
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
