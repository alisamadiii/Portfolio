"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Checkbox } from "@workspace/ui/components/checkbox";

import { useTRPC } from "@workspace/trpc/client";

import { useProject } from "@/hooks/use-project";

import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { TriangleAlert } from "@/components/icon";

// ─── Delete this site (bottom of the Billing page) ──
// Permanently deletes everything about the project — all hub data — and
// cancels + refunds the paid subscription. Never touches the GitHub repo, the
// user's integration tokens, or emails.

const DELETED = [
  "The project's website URL, blog posts, and any collaborators",
  "The project itself: it disappears from your hub",
];

const PRESERVED = [
  "Your GitHub repository (code is never touched)",
  "Your GitHub connection (tokens stay linked)",
  "Your emails and sending setup",
];

export const DeleteSiteCard = () => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const project = useProject();
  const repo = project?.repo;
  const projectId = project?.projectId ?? "";

  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const deleteMutation = useMutation(
    trpc.project.delete.mutationOptions({
      onSuccess: () => {
        // The dashboard's project list is cached (5 min staleTime): drop the
        // card now, then refetch the list so it matches the server.
        const { queryKey } = trpc.cms.repos.listMine.queryOptions(undefined);
        queryClient.setQueryData(queryKey, (old) =>
          old?.filter((project) => project.projectId !== projectId)
        );
        void queryClient.invalidateQueries({ queryKey });
        toast.success("Project deleted.");
        router.push("/");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  if (!repo || !projectId) return null;

  return (
    <section className="flex max-w-screen-md flex-col gap-3">
      <h2 className="text-base font-semibold">Delete this site</h2>
      <Card className="overflow-hidden border-danger/30">
        <div className="flex items-center gap-2 border-b border-divider bg-danger-soft px-6 py-4">
          <TriangleAlert className="size-4 text-danger" />
          <p className="text-sm font-semibold text-danger">This cannot be undone</p>
        </div>
        <div>

          <div className="space-y-5 px-6 py-5">
            <p className="text-sm text-ink-3">
              This is permanent and cannot be undone. Deleting{" "}
              <span className="font-semibold">{repo}</span> will:
            </p>

            <ul className="space-y-2">
              {DELETED.map((item) => (
                <li key={item} className="flex gap-2 text-[13px]">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" />
                  <span className="text-ink-3">{item}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-inner bg-danger-soft px-4 py-3">
              <p className="text-[13px] text-ink-3">
                Any active paid subscription for this project is{" "}
                <span className="font-semibold">
                  cancelled immediately and the unused time is refunded
                </span>
                .
              </p>
            </div>

            <div>
              <p className="text-[13px] font-semibold">What stays untouched</p>
              <ul className="mt-2 space-y-2">
                {PRESERVED.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-[13px] text-dim"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-faint" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3.5 border-t border-divider bg-sidebar px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(value) => setAcknowledged(value === true)}
              />
              <span className="text-ink-3">I understand this permanently deletes everything above.</span>
            </label>

            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    className="shrink-0 border-danger/40 text-danger hover:bg-danger-soft"
                    disabled={!acknowledged || deleteMutation.isPending}
                  />
                }
              >
                Delete site
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {repo}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cancels and refunds any paid subscription and wipes all
                    its hub data. Your GitHub repo and connection stay. This
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="grid grid-cols-2 gap-2">
                  <AlertDialogCancel render={<Button disabled={deleteMutation.isPending} />}>
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    variant="dark"
                    className="bg-danger hover:bg-danger"
                    onClick={() => deleteMutation.mutate({ projectId })}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Delete site"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    </section>
  );
};
