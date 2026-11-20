"use client";

import { useEffect, useState } from "react";
import { useRepo } from "@/hooks/use-repo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

import {
  NETLIFY_CONNECTED_PARAM,
  NetlifyConnectDialog,
} from "@/components/netlify/netlify-connect-dialog";

import { roleAtLeast } from "@/lib/authz-shared";
import { handleCmsError } from "@/lib/trpc-errors";
import {
  transcriptBusy,
  useSessionTranscript,
} from "@/hooks/use-session-transcript";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { SessionChangesDialog } from "@/components/canvas/session-changes-dialog";
import { Loader2, UploadCloud } from "@/components/icon";

/**
 * Header Publish / Discard / Restart for the live AI session (moved out of
 * the chat panel). Publish squash-merges the preview branch onto the site;
 * Discard resets the preview back to the live production site (throwing away
 * this session's changes + chat) while keeping the session open. Restart does
 * the same, stops the AI and restarts the dev server too.
 */
export function SessionActions() {
  const { projectId, session, editToken, noteSessionEnded, onDefaultBranch } =
    useCanvasEditor();
  const { myRole, source } = useRepo();
  const canEdit = roleAtLeast(myRole ?? "full-access", "content-editor");
  const canPublish = (myRole ?? "full-access") === "full-access";
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const sessionQueryKey = trpc.cms.previewSession.get.queryOptions({
    projectId,
  }).queryKey;
  const invalidateSession = () =>
    queryClient.invalidateQueries({ queryKey: sessionQueryKey });

  const publishMutation = useMutation(
    trpc.cms.previewSession.publish.mutationOptions({
      onSuccess: (result) => {
        noteSessionEnded(result.merged ? "published" : "closed");
        invalidateSession();
        if (source === "upload") {
          // The first deploy creates the Netlify site: refresh the sidebar.
          void queryClient.invalidateQueries({
            queryKey: trpc.cms.repos.listMine.queryKey(),
          });
          if (result.netlify === "deploying") {
            toast.success("Published. Deploying to Netlify…");
          } else {
            toast.success("Published.", {
              description: "The Netlify deploy didn't start. Try Redeploy on the Netlify page.",
            });
          }
          return;
        }
        toast.success(
          result.merged
            ? "Published! Changes pushed to GitHub."
            : "Nothing to publish. Session closed."
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

  const restartMutation = useMutation(
    trpc.cms.previewSession.restart.mutationOptions({
      onSuccess: () => {
        invalidateSession();
        // The transcript was cleared server-side — refetch the (empty) log.
        queryClient.invalidateQueries({
          queryKey: ["preview-session-transcript", session?.id],
        });
        toast.success("Restarting the preview…");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  // Same query key as the chat panel's transcript — shared cache, no extra
  // fetch. Publishing mid-run would merge a half-applied change.
  const transcriptQuery = useSessionTranscript(session?.id, editToken);
  const busy = transcriptBusy(transcriptQuery.data);

  const [confirmPublish, setConfirmPublish] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  // Upload projects deploy to Netlify: where, and whether the caller can.
  const netlifyTarget = useQuery(
    trpc.netlify.target.queryOptions(
      { projectId },
      { enabled: source === "upload" && canPublish }
    )
  );
  const startPublish = async () => {
    if (source !== "upload") {
      setConfirmPublish(true);
      return;
    }
    const target = (await netlifyTarget.refetch()).data;
    if (target?.action === "needs_netlify") setConnectOpen(true);
    else setConfirmPublish(true);
  };

  // Back from the Netlify OAuth link: drop the marker and resume publishing.
  useEffect(() => {
    if (source !== "upload" || !canPublish || !session) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(NETLIFY_CONNECTED_PARAM) !== "connected") return;
    url.searchParams.delete(NETLIFY_CONNECTED_PARAM);
    window.history.replaceState(null, "", url.toString());
    void startPublish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, canPublish, session?.id]);

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const TERMINAL_STATUSES = [
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
      {editToken && (
        <SessionChangesDialog sessionId={session.id} editToken={editToken} />
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={busy || resetMutation.isPending || restartMutation.isPending}
        onClick={() => setConfirmDiscard(true)}
      >
        {resetMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : null}
        Discard
      </Button>
      {/* Allowed while the AI is busy: restarting stops it. */}
      <Button
        size="sm"
        variant="outline"
        disabled={
          resetMutation.isPending ||
          restartMutation.isPending ||
          publishMutation.isPending
        }
        onClick={() => setConfirmRestart(true)}
      >
        {restartMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : null}
        Restart
      </Button>
      {canPublish && (
        <Button
          size="sm"
          disabled={
            busy ||
            publishMutation.isPending ||
            (session.status !== "ready" && session.status !== "paused")
          }
          onClick={() => void startPublish()}
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
              {netlifyTarget.data?.siteUrl
                ? `Everything you see in the preview goes live on ${netlifyTarget.data.siteUrl.replace(/^https?:\/\//, "")}.`
                : "Everything you see in the preview goes live on your website."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {source === "upload" && netlifyTarget.data && (
            <p className="text-sm text-muted-foreground">
              {netlifyTarget.data.siteUrl
                ? "Deploys to the project's Netlify site."
                : netlifyTarget.data.host === "agency"
                  ? "Your website will be created on the agency Netlify account."
                  : "Your website will be created on the project owner's Netlify account."}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Close immediately — the header Publish button shows the
                // loading spinner (publishMutation.isPending) from here on.
                setConfirmPublish(false);
                publishMutation.mutate({ projectId, sessionId: session.id });
              }}
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NetlifyConnectDialog open={connectOpen} onClose={() => setConnectOpen(false)} />

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {onDefaultBranch ? "Discard changes?" : "Reset this branch?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {onDefaultBranch
                ? "This throws away every change from this session and resets the preview to your live production site. Your chat history clears and the preview stays open so you can keep editing."
                : `This resets "${session.branch}" back to your live production site. Every change made on this branch is removed, your chat history clears, and the preview stays open so you can keep editing.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                resetMutation.mutate({ projectId, sessionId: session.id });
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart the preview?</AlertDialogTitle>
            <AlertDialogDescription>
              This stops the AI, clears the chat and throws away changes you
              haven&apos;t published. The preview reloads from your live site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmRestart(false);
                restartMutation.mutate({ projectId, sessionId: session.id });
              }}
            >
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
