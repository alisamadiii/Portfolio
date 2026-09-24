"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useMutation } from "@tanstack/react-query";
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
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";

import { useTRPC } from "@workspace/trpc/client";

import { TriangleAlert } from "@/components/icon";

// ─── Danger panel (Site Settings › Danger) ──────────────────────
// Permanently deletes everything about the project — all hub data — and
// cancels + refunds the paid subscription. Never touches the GitHub repo, the
// user's integration tokens, or emails.

const DELETED = [
  "The project's website URL, blog posts, and any collaborators",
  "The project itself — it disappears from your hub",
];

const PRESERVED = [
  "Your GitHub repository (code is never touched)",
  "Your GitHub connection (tokens stay linked)",
  "Your emails and sending setup",
];

export const DangerPanel = () => {
  const trpc = useTRPC();
  const router = useRouter();
  const { config } = useConfig();
  const owner = config?.owner;
  const repo = config?.repo;

  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const deleteMutation = useMutation(
    trpc.project.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Project deleted.");
        router.push("/");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  if (!owner || !repo) return null;

  return (
    <div className="mx-auto w-full max-w-screen-md p-6">
      <div className="mb-6">
        <h2 className="text-[22px] font-extrabold tracking-tight">Danger</h2>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Permanently delete this project and everything attached to it.
        </p>
      </div>

      <div className="ring-destructive/20 bg-card overflow-hidden rounded-lg border shadow-sm ring-1">
        <div className="border-destructive/15 bg-destructive/4 flex items-center gap-2 border-b px-5.5 py-4.5">
          <TriangleAlert className="text-destructive size-4.5" />
          <p className="text-destructive font-bold">Delete this project</p>
        </div>

        <div className="space-y-5 px-5.5 py-5">
          <p className="text-secondary-foreground text-sm">
            This is permanent and cannot be undone. Deleting{" "}
            <span className="font-semibold">{repo}</span> will:
          </p>

          <ul className="space-y-2">
            {DELETED.map((item) => (
              <li key={item} className="flex gap-2 text-[13px]">
                <span className="text-destructive mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />
                <span className="text-secondary-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <div className="border-destructive/15 bg-destructive/4 rounded-md border px-4 py-3">
            <p className="text-secondary-foreground text-[13px]">
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
                  className="text-muted-foreground flex gap-2 text-[13px]"
                >
                  <span className="bg-muted-foreground/50 mt-1.5 size-1.5 shrink-0 rounded-full" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-destructive/15 bg-destructive/4 flex flex-col gap-3.5 border-t px-5.5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(value) => setAcknowledged(value === true)}
            />
            <span className="text-secondary-foreground">
              I understand this permanently deletes everything above.
            </span>
          </label>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive"
                  className="bg-status-danger-bg text-destructive hover:bg-status-danger-bg/70 shrink-0 rounded-full px-6"
                  disabled={!acknowledged || deleteMutation.isPending}
                  size="lg"
                />
              }
            >
              Delete project
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
                <AlertDialogCancel
                  render={
                    <Button
                      variant="outline"
                      disabled={deleteMutation.isPending}
                      size="lg"
                    />
                  }
                >
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate({ owner, repo })}
                  isLoading={deleteMutation.isPending}
                  size="lg"
                >
                  Delete project
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};
