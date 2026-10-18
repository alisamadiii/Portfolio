"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";

import {
  DiffDialogBody,
  type DiffFile,
} from "@/components/canvas/file-diff-dialog";
import { GitCompare } from "@/components/icon";

/**
 * Header "Changes": every file the session has changed vs the live site, each
 * as a before/after diff. Git-backed on content-pilot (merge-base → head), so
 * it covers every turn and survives reloads; the per-file diff is the same
 * route the chat's step buttons use.
 */

const pilotUrl = (process.env.NEXT_PUBLIC_CONTENT_PILOT_URL ?? "").replace(
  /\/+$/,
  ""
);

export type SessionChanges = {
  head: string;
  base: string;
  files: Array<Required<DiffFile>>;
};

export const sessionChangesQueryKey = (sessionId: string | null | undefined) =>
  ["preview-session-changes", sessionId] as const;

/** Shared by the Changes dialog and the branch menu (one cache entry). */
export const sessionChangesQueryOptions = (
  sessionId: string,
  editToken: string
) => ({
  queryKey: sessionChangesQueryKey(sessionId),
  queryFn: async (): Promise<SessionChanges> => {
    const res = await fetch(
      `${pilotUrl}/api/v1/sessions/${sessionId}/changes`,
      { headers: { Authorization: `Bearer ${editToken}` } }
    );
    if (!res.ok) throw new Error(`changes ${res.status}`);
    return (await res.json()) as SessionChanges;
  },
});

export function SessionChangesDialog({
  sessionId,
  editToken,
}: {
  sessionId: string;
  editToken: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <GitCompare className="size-4" />
            Changes
          </Button>
        }
      />
      <DialogContent className="bg-card flex max-h-[85dvh] min-h-[500px] flex-col gap-3 overflow-hidden p-0 md:max-w-6xl">
        {open && <Content sessionId={sessionId} editToken={editToken} />}
      </DialogContent>
    </Dialog>
  );
}

const Content = ({
  sessionId,
  editToken,
}: {
  sessionId: string;
  editToken: string;
}) => {
  const query = useQuery(sessionChangesQueryOptions(sessionId, editToken));
  const queryClient = useQueryClient();
  // Manual revert: content-pilot puts the file back to its live-site version
  // and commits that on the session branch. The AI never reverts anything —
  // a "revert" chat message gets pointed here instead.
  const revertMutation = useMutation({
    mutationFn: async (file: DiffFile) => {
      const res = await fetch(
        `${pilotUrl}/api/v1/sessions/${sessionId}/revert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${editToken}`,
          },
          body: JSON.stringify({ path: file.path }),
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not revert this file.");
      }
      return file;
    },
    onSuccess: (file) => {
      toast.success(`Reverted ${file.path}`);
      void queryClient.invalidateQueries({
        queryKey: sessionChangesQueryKey(sessionId),
      });
    },
    onError: (error) => toast.error(error.message),
  });

  if (query.isPending) {
    return (
      <>
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-[15px]">Your changes</DialogTitle>
          <DialogDescription className="text-[12px]">
            Everything edited in this session, compared with your live site.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 border-t p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-[15px]">Your changes</DialogTitle>
        </DialogHeader>
        <p className="text-destructive border-t px-4 py-3 text-xs">
          Could not load the changes. Please try again.
        </p>
      </>
    );
  }
  if (query.data.files.length === 0) {
    return (
      <>
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-[15px]">Your changes</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground border-t px-4 py-3 text-[13px]">
          No changes yet — the preview matches your live site.
        </p>
      </>
    );
  }
  return (
    <DiffDialogBody
      sessionId={sessionId}
      editToken={editToken}
      from={query.data.base}
      to={query.data.head}
      files={query.data.files}
      title="Your changes"
      description={`${query.data.files.length} ${query.data.files.length === 1 ? "file" : "files"} changed since your live site. Red lines were removed, green lines were added. Revert puts a file back exactly as it is live.`}
      onRevert={(file) => revertMutation.mutate(file)}
      revertingPath={
        revertMutation.isPending ? revertMutation.variables?.path : null
      }
    />
  );
};
