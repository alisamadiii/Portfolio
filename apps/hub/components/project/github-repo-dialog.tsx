"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ExternalLink, GitCommitHorizontal, Lock } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Github } from "@workspace/ui/icons/social";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { useTRPC } from "@workspace/trpc/client";

import { Button } from "@/components/ds/ui/button";
import { repoPath } from "@/lib/paths";

/**
 * "GitHub" on an uploaded project's home (owner or admin): the private repo
 * the hub keeps the source in, its latest commit, and "Pull latest commit",
 * which makes the editor workspace that exact commit. The reverse of the
 * automatic backup: edit on GitHub, pull it in here. Like Import, the live
 * site keeps the old version until a redeploy.
 */
export function GithubRepoDialog({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const info = useQuery({
    ...trpc.project.backupRepoInfo.queryOptions({ projectId }),
    enabled: open,
    retry: false,
  });
  const pull = useMutation(
    trpc.project.pullFromBackup.mutationOptions({
      onSuccess: async ({ sha, netlify }) => {
        await queryClient.invalidateQueries();
        setOpen(false);
        toast.success(`Pulled ${sha.slice(0, 7)} from GitHub.`, {
          description: netlify
            ? "Your live site still shows the old version until you redeploy."
            : undefined,
          action: netlify
            ? { label: "Redeploy", onClick: () => router.push(`${repoPath(projectId)}/netlify`) }
            : undefined,
        });
      },
      onError: (error) => {
        toast.error(error.message);
        // Stale head or a race with another import: show what GitHub has now.
        void info.refetch();
      },
    })
  );

  const data = info.data;
  const repo = data?.repo ?? null;
  const head = data?.head ?? null;
  const inSync = !!head && data?.workspaceSha === head.sha;
  const busy = pull.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
      }}
    >
      <Button icon={<Github className="size-[15px]" />} onClick={() => setOpen(true)}>
        GitHub
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>GitHub repository</DialogTitle>
          <DialogDescription>
            Every published version of this site is kept in a private repository. Pull its latest
            commit here when the code was changed on GitHub.
          </DialogDescription>
        </DialogHeader>

        {info.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-inner" />
            <Skeleton className="h-24 w-full rounded-inner" />
          </div>
        ) : info.isError ? (
          <p className="text-sm text-dim">{info.error.message}</p>
        ) : !repo ? (
          <p className="text-sm text-dim">
            No GitHub repository yet. It is created the first time this site is imported or
            published.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-inner border border-line px-4 py-3">
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink underline-offset-2 hover:underline"
              >
                <span className="truncate">{repo.fullName}</span>
                <ExternalLink className="size-3.5 shrink-0 text-dim" aria-hidden />
              </a>
              <span className="inline-flex items-center gap-1 text-[13px] text-dim">
                <Lock className="size-3" aria-hidden /> Private
              </span>
              {repo.pushedAt && (
                <span className="ml-auto text-[13px] text-dim">
                  Last push {formatDistanceToNow(new Date(repo.pushedAt), { addSuffix: true })}
                </span>
              )}
            </div>

            {!head ? (
              <p className="text-sm text-dim">The repository is empty. Nothing to pull yet.</p>
            ) : (
              <div className="flex flex-col gap-2 rounded-inner border border-line px-4 py-3">
                <span className="text-[13px] text-dim">Latest commit on {repo.defaultBranch}</span>
                <p className="text-sm font-medium text-ink">{head.message.split("\n")[0]}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-dim">
                  <span className="inline-flex items-center gap-1.5">
                    {head.authorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={head.authorAvatar}
                        alt=""
                        width={18}
                        height={18}
                        className="size-[18px] rounded-full"
                      />
                    ) : (
                      <GitCommitHorizontal className="size-4" aria-hidden />
                    )}
                    {head.authorName || head.authorLogin || "Unknown author"}
                  </span>
                  <a
                    href={head.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-coral-text underline-offset-2 hover:underline"
                  >
                    {head.sha.slice(0, 7)}
                  </a>
                  {head.committedAt && (
                    <span title={format(new Date(head.committedAt), "PPpp")}>
                      {formatDistanceToNow(new Date(head.committedAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-dim">
                  {inSync
                    ? "Your editor workspace is on this commit."
                    : "GitHub is ahead of your editor workspace."}
                </p>
                {data?.backupError && (
                  <p className="text-[13px] text-coral-text">Last backup failed: {data.backupError}</p>
                )}
              </div>
            )}

            {head && !inSync && (
              <p className="text-[13px] text-dim">
                Pulling replaces the editor workspace with this commit. Unpublished editor changes
                and anything not yet backed up to GitHub are lost. Your live site keeps the current
                version until you redeploy.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy || !head || inSync}
            onClick={() => head && pull.mutate({ projectId, sha: head.sha })}
          >
            {busy ? "Pulling…" : "Pull latest commit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
