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

import { repoPath } from "@/lib/paths";
import { useRepo } from "@/hooks/use-repo";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { SessionActions } from "@/components/canvas/session-actions";
import { ArrowLeft, Info, Settings } from "@/components/icon";
import { AiIntroDialog } from "@/components/shell/ai-intro-dialog";
import { InviteButton } from "@/components/shell/invite-button";
import { User } from "@/components/user";

/**
 * Docked top bar. Left: back arrow (to the project's Home) + brand mark.
 * Right: guide, project settings (website URL, full access), user menu,
 * Invite (full access), Publish (content editor+). Images are attached in
 * the chat. Site settings (Domain / Speed / Billing) are routed pages under
 * the project, so there is no Settings tab here.
 */
export function ShellHeader({
  onToggleDocs,
  onOpenProjectSettings,
}: {
  onToggleDocs: () => void;
  /** Opens the website project settings dialog (website URL). */
  onOpenProjectSettings: () => void;
}) {
  const router = useRouter();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const { projectId } = useCanvasEditor();
  const { myRole } = useRepo();
  const canManage = (myRole ?? "full-access") === "full-access";
  const leaveHref = repoPath(projectId);

  return (
    <header className="bg-background relative flex h-11 shrink-0 items-center gap-2 border-b px-2.5">
      {/* Left */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to project"
          onClick={() => setLeaveOpen(true)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave the editor?</AlertDialogTitle>
              <AlertDialogDescription>
                You&apos;ll return to this project&apos;s home.
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

      {/* Right */}
      <div className="ml-auto flex items-center gap-1.5">
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
        {canManage && (
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
