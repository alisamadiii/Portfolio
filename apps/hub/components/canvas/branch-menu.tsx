"use client";

import { useState } from "react";
import { useRepo } from "@/contexts/repo-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import { useTRPC } from "@workspace/trpc/client";

import { roleAtLeast } from "@/lib/authz-shared";
import { isValidBranchName, slugifyBranchName } from "@/lib/branch-name";
import { handleCmsError } from "@/lib/trpc-errors";
import {
  transcriptBusy,
  useSessionTranscript,
} from "@/hooks/use-session-transcript";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { sessionChangesQueryOptions } from "@/components/canvas/session-changes-dialog";
import {
  Check,
  ChevronDown,
  GitBranch,
  Loader2,
  Plus,
} from "@/components/icon";
import { SubmitButton } from "@/components/submit-button";

/**
 * The "⎇ main" chip in the canvas header, now a menu: the default branch (the
 * live site) plus every named branch on GitHub, and "New branch" to start an
 * experiment. Picking one moves the preview session to that branch: the
 * current session ends and a fresh one boots on the target, so the canvas and
 * chat show that variation. Switching is blocked while the AI is mid-edit and
 * while a default-branch preview still has unpublished changes (its temporary
 * preview branch is deleted on switch). Named branches keep their commits.
 */
export const BranchMenu = () => {
  const {
    repoId,
    branch: defaultBranchHint,
    session,
    editToken,
    noteSessionEnded,
    onDefaultBranch,
  } = useCanvasEditor();
  const { myRole, source } = useRepo();
  const canEdit = roleAtLeast(myRole ?? "full-access", "content-editor");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const branchesQuery = useQuery(
    trpc.cms.previewSession.branches.queryOptions(
      { repoId },
      {
        enabled: Boolean(repoId) && canEdit && source !== "upload",
        staleTime: 30_000,
      }
    )
  );
  const defaultBranch =
    branchesQuery.data?.defaultBranch || defaultBranchHint || "main";
  const currentLabel = onDefaultBranch ? defaultBranch : session!.branch;

  // Same cache entries as the chat panel / Changes dialog — no extra fetches.
  const transcriptQuery = useSessionTranscript(session?.id, editToken);
  const busy = transcriptBusy(transcriptQuery.data);
  const changesQuery = useQuery({
    ...sessionChangesQueryOptions(session?.id ?? "", editToken),
    enabled: Boolean(
      session && onDefaultBranch && editToken && session.status === "ready"
    ),
  });
  const hasUnpublished =
    onDefaultBranch && (changesQuery.data?.files.length ?? 0) > 0;

  const booting =
    !session ||
    session.status === "starting" ||
    session.status === "installing" ||
    session.status === "restarting";

  const sessionQueryKey = trpc.cms.previewSession.get.queryOptions({
    repoId,
  }).queryKey;
  const branchesQueryKey = trpc.cms.previewSession.branches.queryOptions({
    repoId,
  }).queryKey;
  const afterSwitch = (target: string) => {
    noteSessionEnded({ switched: target });
    void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    void queryClient.invalidateQueries({ queryKey: branchesQueryKey });
  };

  const switchMutation = useMutation(
    trpc.cms.previewSession.switchBranch.mutationOptions({
      onSuccess: (_session, variables) => afterSwitch(variables.branch),
      onError: (error) =>
        toast.error(handleCmsError(error, "Could not switch branches.")),
    })
  );
  const createMutation = useMutation(
    trpc.cms.previewSession.createBranch.mutationOptions({
      onSuccess: (_session, variables) => {
        setDialogOpen(false);
        afterSwitch(variables.name);
        toast.success(`Branch "${variables.name}" created.`);
      },
      onError: (error) =>
        toast.error(handleCmsError(error, "Could not create the branch.")),
    })
  );
  const switching = switchMutation.isPending || createMutation.isPending;

  const blockedReason = busy
    ? "Wait for the AI to finish editing."
    : hasUnpublished
      ? "Publish or discard your changes first."
      : booting
        ? "The preview is still starting."
        : null;
  const canSwitch = !blockedReason && !switching;

  // Uploaded projects live on a single local main — no branches to switch.
  if (source === "upload") return null;

  if (!canEdit) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 px-1.5">
        <GitBranch className="size-3.5 shrink-0" />
        <span className="truncate">{currentLabel}</span>
      </span>
    );
  }

  const switchTo = (target: string) => {
    if (target === currentLabel) return;
    switchMutation.mutate({ repoId, branch: target });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-7 max-w-[220px] gap-1.5 px-1.5 text-[12px] font-normal"
            >
              <GitBranch className="size-3.5 shrink-0" />
              <span className="truncate">{currentLabel}</span>
              {switching ? (
                <Loader2 className="size-3 shrink-0 animate-spin" />
              ) : (
                <ChevronDown className="size-3 shrink-0" />
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="start" sideOffset={6} className="w-64">
          {/* base-ui: a GroupLabel must live inside a Menu.Group. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium">
              {blockedReason ?? "Preview a branch"}
            </DropdownMenuLabel>
            <DropdownMenuItem
              disabled={!canSwitch || onDefaultBranch}
              onClick={() => switchTo(defaultBranch)}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {onDefaultBranch && <Check className="size-3.5" />}
              </span>
              <span className="truncate">{defaultBranch}</span>
              <span className="text-muted-foreground ml-auto text-[11px]">
                live site
              </span>
            </DropdownMenuItem>
            {branchesQuery.isPending && (
              <DropdownMenuItem disabled>
                <Loader2 className="size-3.5 animate-spin" />
                Loading branches…
              </DropdownMenuItem>
            )}
            {branchesQuery.data?.branches.map((name) => {
              const current = !onDefaultBranch && session?.branch === name;
              return (
                <DropdownMenuItem
                  key={name}
                  disabled={!canSwitch || current}
                  onClick={() => switchTo(name)}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {current && <Check className="size-3.5" />}
                  </span>
                  <span className="truncate">{name}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!canSwitch}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-3.5" />
            New branch…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {dialogOpen && (
            <NewBranchForm
              defaultBranch={defaultBranch}
              existing={branchesQuery.data?.branches ?? []}
              pending={createMutation.isPending}
              onSubmit={(name) => createMutation.mutate({ repoId, name })}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const NewBranchForm = ({
  defaultBranch,
  existing,
  pending,
  onSubmit,
}: {
  defaultBranch: string;
  existing: string[];
  pending: boolean;
  onSubmit: (name: string) => void;
}) => {
  const [label, setLabel] = useState("");
  const slug = slugifyBranchName(label);
  const taken = slug === defaultBranch || existing.includes(slug);
  const valid = slug.length > 0 && isValidBranchName(slug) && !taken;
  const hint = !label.trim()
    ? null
    : !slug
      ? "Use letters or numbers in the name."
      : taken
        ? "A branch with that name already exists."
        : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>New branch</DialogTitle>
        <DialogDescription>
          A separate copy of your live site to try changes on. Nothing goes live
          until you publish it.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid || pending) return;
          onSubmit(slug);
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="branch-name">Branch name</Label>
          <Input
            id="branch-name"
            autoFocus
            placeholder="New hero test"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={80}
          />
          <p
            className={
              hint
                ? "text-destructive text-[12px]"
                : "text-muted-foreground text-[12px]"
            }
          >
            {hint ??
              (slug ? (
                <>
                  Will be created as{" "}
                  <span className="text-foreground font-mono">{slug}</span>
                </>
              ) : (
                "Pick a short name you will recognise later."
              ))}
          </p>
        </div>
        <DialogFooter>
          <SubmitButton type="submit" disabled={!valid || pending}>
            Create and switch
          </SubmitButton>
        </DialogFooter>
      </form>
    </>
  );
};
