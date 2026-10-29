"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { isAdminUser } from "@/lib/authz-shared";
import { repoPath } from "@/lib/paths";

type View = "website" | "agency";

/**
 * Admin-only Website ⇄ Agency tabs. The choice is a per-project cookie the
 * /p/[projectId] layout reads (admins only) to pick the slot; switching to Agency
 * on a project without a workspace creates one first.
 */
export function AdminViewSwitch({
  projectId,
  current,
  className,
}: {
  projectId: string;
  current: View;
  className?: string;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const isAdmin = isAdminUser(useCurrentUser().data?.user ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const status = useQuery({
    ...trpc.agency.admin.adminView.queryOptions({ projectId }),
    enabled: isAdmin,
  });
  const enable = useMutation(
    trpc.agency.admin.enableForProject.mutationOptions()
  );

  if (!isAdmin) return null;

  const go = (view: View) => {
    document.cookie = `hub-view-${projectId}=${view}; path=/; max-age=31536000; samesite=lax`;
    router.push(repoPath(projectId));
    router.refresh();
  };

  const pick = (view: View) => {
    if (view === current) return;
    if (view === "agency" && status.data && !status.data.hasAgency) {
      setConfirmOpen(true);
      return;
    }
    go(view);
  };

  return (
    <>
      <div
        className={cn(
          "bg-muted flex items-center gap-0.5 rounded-lg p-0.5",
          className
        )}
      >
        {(["website", "agency"] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => pick(view)}
            data-active={view === current}
            className={cn(
              "flex h-[26px] flex-1 items-center justify-center rounded-md px-2.5 text-[12.5px] font-semibold capitalize transition-colors",
              view === current
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {view}
          </button>
        ))}
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create an agency workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This project has no agency workspace yet. One will be created for
              the project owner, with no subscription required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={enable.isPending}
              onClick={() =>
                enable.mutate(
                  { projectId },
                  {
                    onSuccess: () => go("agency"),
                    onError: (error) => toast.error(error.message),
                  }
                )
              }
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
