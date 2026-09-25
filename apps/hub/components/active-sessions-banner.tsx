"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { useTRPC } from "@workspace/trpc/client";

import { useUser } from "@/contexts/user-context";
import { repoPath } from "@/lib/paths";

import { Loader2, PaintbrushSparkle, X } from "@/components/icon";

/**
 * Dashboard reminder that live AI editing sessions are still running. Each
 * session holds a dev server on the preview host, so anything the client
 * forgot about should be easy to jump back into or end right here.
 */
export function ActiveSessionsBanner() {
  const { user } = useUser();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery(
    trpc.cms.previewSession.listMine.queryOptions(undefined, {
      enabled: !!user,
      refetchInterval: 30_000,
    })
  );
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.cms.previewSession.listMine.queryOptions(undefined)
        .queryKey,
    });

  const closeMutation = useMutation(
    trpc.cms.previewSession.close.mutationOptions({
      onSuccess: () => {
        invalidate();
        toast.success("Session ended");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const sessions = sessionsQuery.data?.sessions ?? [];
  if (!sessions.length) return null;

  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/40">
      <div className="flex items-center gap-2">
        <PaintbrushSparkle className="size-4 text-amber-600 dark:text-amber-400" />
        <h2 className="text-[14px] font-semibold text-amber-900 dark:text-amber-200">
          You have {sessions.length === 1 ? "an" : sessions.length} active
          editing session{sessions.length === 1 ? "" : "s"}
        </h2>
      </div>
      <p className="mt-1 text-[13px] text-amber-800/80 dark:text-amber-300/80">
        A live preview is still running for the site{sessions.length === 1 ? "" : "s"}{" "}
        below. Jump back in to keep editing, or end the session if you're done —
        unpublished changes are discarded when a session ends.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="bg-background flex items-center gap-3 rounded-lg border px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {session.owner}/{session.repo}
            </span>
            <span className="text-muted-foreground hidden text-[12px] sm:block">
              started{" "}
              {new Date(session.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href={repoPath(session.repo)}>Open</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={closeMutation.isPending}
              onClick={() =>
                closeMutation.mutate({
                  owner: session.owner,
                  repo: session.repo,
                  sessionId: session.id,
                })
              }
            >
              {closeMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
              End
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
