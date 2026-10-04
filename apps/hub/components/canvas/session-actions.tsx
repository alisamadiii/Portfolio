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
import { handleCmsError } from "@/lib/trpc-errors";
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
 * resets the preview back to the live production site (throwing away this
 * session's changes + chat) while keeping the session open.
 */
export function SessionActions() {
  const { repoId, session, editToken } = useCanvasEditor();
  const { myRole } = useRepo();
  const canEdit = roleAtLeast(myRole ?? "full-access", "content-editor");
  const canPublish = (myRole ?? "full-access") === "full-access";
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const sessionQueryKey = trpc.cms.previewSession.get.queryOptions({
    repoId,
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
      // PAYMENT_REQUIRED opens the purchase dialog instead of a toast.
      onError: (error) => toast.error(handleCmsError(error, error.message)),
    })
  );
  const resetMutation = useMutation(
    trpc.cms.previewSession.reset.mutationOptions({
      onSuccess: () => {
        invalidateSession();
        // The transcript was cleared server-side — refetch the (empty) log.
        queryClient.invalidateQueries({
          queryKey: ["preview-session-transcript", session?.id],
        });
        toast.success("Changes discarded — preview reset to your live site.");
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
        disabled={busy || resetMutation.isPending}
        onClick={() => setConfirmDiscard(true)}
      >
        {resetMutation.isPending ? (
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
                publishMutation.mutate({ repoId, sessionId: session.id });
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
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This throws away every change from this session and resets the
              preview to your live production site. Your chat history clears and
              the preview stays open so you can keep editing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                resetMutation.mutate({ repoId, sessionId: session.id });
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
