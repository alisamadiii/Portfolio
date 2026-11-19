"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { useTRPC } from "@workspace/trpc/client";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { selectProject } from "@/app/actions/workspace";

import { Loader2, PaintbrushSparkle, X } from "@/components/icon";

/**
 * Dashboard reminder that live AI editing sessions are still running. Each
 * session holds a dev server on the preview host, so anything the client
 * forgot about should be easy to jump back into or end right here.
 */
export function ActiveSessionsBanner() {
  const user = useCurrentUser().data?.user ?? null;
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
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <PaintbrushSparkle className="size-4 text-coral" />
        <h2 className="text-[14px] font-semibold text-ink">
          You have {sessions.length === 1 ? "an" : sessions.length} active
          editing session{sessions.length === 1 ? "" : "s"}
        </h2>
      </div>
      <p className="mt-1 text-[13px] text-dim">
        A live preview is still running for the site{sessions.length === 1 ? "" : "s"}{" "}
        below. Jump back in to keep editing, or end the session if you&apos;re done.
        Unpublished changes are discarded when a session ends.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex items-center gap-3 rounded-inner border border-line bg-canvas px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {session.owner}/{session.repo}
            </span>
            <span className="hidden text-[12px] text-faint sm:block">
              started{" "}
              {new Date(session.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void selectProject(session.projectId, "/website")}
            >
              Open
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-dim"
              disabled={closeMutation.isPending}
              onClick={() =>
                closeMutation.mutate({
                  projectId: session.projectId,
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
