"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

import { useTRPC } from "@workspace/trpc/client";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import {
  transcriptBusy,
  useSessionTranscript,
} from "@/hooks/use-session-transcript";
import { Loader2, UploadCloud } from "@/components/icon";
import { useRepo } from "@/contexts/repo-context";
import { roleAtLeast } from "@/lib/authz-shared";

/**
 * Header Publish / Discard for the live AI session (moved out of the chat
 * panel). Publish squash-merges the preview branch onto the site; Discard
 * closes the session and throws its changes away.
 */
export function SessionActions() {
  const { owner, repo, session, editToken } = useCanvasEditor();
  const { myRole } = useRepo();
  const canEdit = roleAtLeast(myRole ?? "full-access", "content-editor");
  const canPublish = (myRole ?? "full-access") === "full-access";
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const sessionQueryKey = trpc.cms.previewSession.get.queryOptions({
    owner,
    repo,
  }).queryKey;
  const invalidateSession = () =>
    queryClient.invalidateQueries({ queryKey: sessionQueryKey });

  const publishMutation = useMutation(
    trpc.cms.previewSession.publish.mutationOptions({
      onSuccess: (result) => {
        invalidateSession();
        toast.success(
          result.merged
            ? "Published! Your site is deploying now."
            : "Nothing to publish — session closed."
        );
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const closeMutation = useMutation(
    trpc.cms.previewSession.close.mutationOptions({
      onSuccess: () => {
        invalidateSession();
        toast.success("Session discarded");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  // Same query key as the chat panel's transcript — shared cache, no extra
  // fetch. Publishing mid-run would merge a half-applied change.
  const transcriptQuery = useSessionTranscript(session?.id, editToken);
  const busy = transcriptBusy(transcriptQuery.data);

  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const TERMINAL_STATUSES = [
    "needs_config",
    "failed",
    "closed",
    "published",
    "expired",
  ];
  if (!canEdit || !session || TERMINAL_STATUSES.includes(session.status)) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={busy || closeMutation.isPending}
        onClick={() => setConfirmDiscard(true)}
      >
        {closeMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : null}
        Discard
      </Button>
      {canPublish && (
        <Button
          size="sm"
          disabled={
            busy ||
            publishMutation.isPending ||
            (session.status !== "ready" && session.status !== "paused")
          }
          onClick={() => setConfirmPublish(true)}
        >
          {publishMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UploadCloud className="size-4" />
          )}
          Publish
        </Button>
      )}

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish these changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Everything you see in the preview goes live on your website.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Close immediately — the header Publish button shows the
                // loading spinner (publishMutation.isPending) from here on.
                setConfirmPublish(false);
                publishMutation.mutate({ owner, repo, sessionId: session.id });
              }}
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this session?</AlertDialogTitle>
            <AlertDialogDescription>
              The preview closes and the changes from this session are thrown
              away. Your live site is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                closeMutation.mutate({ owner, repo, sessionId: session.id })
              }
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
