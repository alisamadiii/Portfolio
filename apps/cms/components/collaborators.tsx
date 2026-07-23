"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { BookText, EllipsisVertical, Loader } from "lucide-react";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import {
  handleAddCollaborator,
  handleRemoveCollaborator,
  handleResendCollaboratorInvite,
} from "@/lib/actions/collaborator";
import { requireApiSuccess } from "@/lib/api-client";

import { useRepoHeader } from "@/components/repo/repo-header-context";
import { SubmitButton } from "@/components/submit-button";

type Collaborator = {
  id: number;
  email: string;
};

type AddCollaboratorState = {
  message?: string;
  error?: string;
  errors?: string[];
  data?: Collaborator[];
};

function InviteCollaboratorsDialog({
  owner,
  repo,
  state,
  action,
  open,
  onOpenChange,
  value,
  onValueChange,
  disabled,
  triggerLabel,
  triggerVariant = "outline",
  triggerSize = "default",
}: {
  owner: string;
  repo: string;
  state: AddCollaboratorState;
  action: (payload: FormData) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
  triggerSize?: "default" | "sm";
}) {
  const parsedInviteEmails = useMemo(() => {
    return Array.from(
      new Set(
        value
          .split(/[\n,]+/)
          .map((email) => email.trim())
          .filter(Boolean)
      )
    );
  }, [value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            disabled={disabled}
          >
            {triggerLabel || "Invite"}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite collaborators</DialogTitle>
          <DialogDescription>
            Enter one or multiple email addresses, separated by commas or new
            lines.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="owner" value={owner} />
          <input type="hidden" name="repo" value={repo} />
          <Textarea
            name="emails"
            placeholder="alice@example.com, bob@example.com"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            required
            rows={6}
          />
          {state?.error ? (
            <p className="text-destructive text-sm font-medium">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <SubmitButton
              type="submit"
              disabled={parsedInviteEmails.length === 0}
            >
              Send invite{parsedInviteEmails.length > 1 ? "s" : ""}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Collaborators({
  owner,
  repo,
  branch,
}: {
  owner: string;
  repo: string;
  branch?: string;
}) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [addCollaboratorState, addCollaboratorAction] = useActionState<
    AddCollaboratorState,
    FormData
  >(handleAddCollaborator, {});
  const [emails, setEmails] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<number[]>([]);
  const [resending, setResending] = useState<number[]>([]);
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined | null>(null);

  const addNewCollaborator = useCallback((newCollaborators: Collaborator[]) => {
    setCollaborators((prevCollaborators) => {
      const seenIds = new Set(
        prevCollaborators.map((collaborator) => collaborator.id)
      );
      const uniqueCollaborators = newCollaborators.filter(
        (collaborator) => !seenIds.has(collaborator.id)
      );
      return [...prevCollaborators, ...uniqueCollaborators];
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCollaborators() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/collaborators/${owner}/${repo}`, {
          signal: controller.signal,
        });
        const data = await requireApiSuccess<{
          status: string;
          data: Collaborator[];
          message?: string;
        }>(response, "Failed to fetch collaborators");

        setCollaborators(data.data);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch collaborators"
        );
      } finally {
        // In React Strict Mode, an aborted first pass can race with the active request.
        // Keep the loading state until the non-aborted request finishes.
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchCollaborators();

    return () => controller.abort();
  }, [owner, repo, branch]);

  useEffect(() => {
    if (addCollaboratorState?.message) {
      if (
        Array.isArray(addCollaboratorState.data) &&
        addCollaboratorState.data.length > 0
      ) {
        addNewCollaborator(addCollaboratorState.data);
      }

      toast.success(addCollaboratorState.message, { duration: 10000 });
      if (
        Array.isArray(addCollaboratorState.errors) &&
        addCollaboratorState.errors.length > 0
      ) {
        toast.error(addCollaboratorState.errors.join("\n"), {
          duration: 10000,
        });
      }
      setEmails("");
      setInviteDialogOpen(false);
    }
  }, [addCollaboratorState, addNewCollaborator]);

  const handleConfirmRemove = async (collaboratorId: number) => {
    setRemoving((prev) => [...prev, collaboratorId]);

    try {
      const removed = await handleRemoveCollaborator(
        collaboratorId,
        owner,
        repo
      );

      if (removed.error) {
        toast.error(removed.error);
      } else {
        setCollaborators((prev) =>
          prev.filter((collaborator) => collaborator.id !== collaboratorId)
        );
        toast.success(removed.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPendingRemoveId(null);
      setRemoving((prev) => prev.filter((id) => id !== collaboratorId));
    }
  };

  const handleResendInvite = async (collaboratorId: number) => {
    setResending((prev) => [...prev, collaboratorId]);

    try {
      const resent = await handleResendCollaboratorInvite(
        collaboratorId,
        owner,
        repo
      );
      if (resent.error) {
        toast.error(resent.error);
      } else {
        toast.success(resent.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResending((prev) => prev.filter((id) => id !== collaboratorId));
    }
  };

  const headerNode = useMemo(() => {
    const showInviteAction = !isLoading && !error && collaborators.length > 0;

    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Collaborators</h1>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  render={
                    <Link
                      href="https://pagescms.org/docs/configuration/collaborators/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <BookText />
                      <span className="sr-only">Collaborators docs</span>
                    </Link>
                  }
                />
              }
            />
            <TooltipContent>View docs</TooltipContent>
          </Tooltip>
        </div>
        {showInviteAction ? (
          <InviteCollaboratorsDialog
            owner={owner}
            repo={repo}
            state={addCollaboratorState}
            action={addCollaboratorAction}
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            value={emails}
            onValueChange={setEmails}
            disabled={isLoading}
            triggerVariant="default"
            triggerSize="default"
          />
        ) : null}
      </div>
    );
  }, [
    addCollaboratorAction,
    addCollaboratorState,
    collaborators.length,
    emails,
    error,
    inviteDialogOpen,
    isLoading,
    owner,
    repo,
  ]);

  useRepoHeader({ header: headerNode });

  const loadingSkeleton = useMemo(
    () => (
      <ul>
        {[0, 1, 2].map((index) => (
          <li
            key={index}
            className="flex items-center gap-x-2 border border-b-0 px-3 py-2 text-sm first:rounded-t-md last:rounded-b-md last:border-b"
          >
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-5 w-24 rounded text-left" />
            <Button
              variant="outline"
              size="icon-xs"
              className="ml-auto"
              disabled
            >
              <EllipsisVertical />
            </Button>
          </li>
        ))}
      </ul>
    ),
    []
  );

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6">
        <Empty className="max-w-[420px] flex-none">
          <EmptyHeader>
            <EmptyTitle>Something went wrong</EmptyTitle>
            <EmptyDescription>
              We couldn&apos;t load the list of collaborators.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const collaboratorToRemove =
    pendingRemoveId === null
      ? null
      : collaborators.find(
          (collaborator) => collaborator.id === pendingRemoveId
        ) || null;

  return (
    <div className="flex h-full flex-col gap-4">
      {isLoading ? (
        loadingSkeleton
      ) : collaborators.length > 0 ? (
        <>
          <ul>
            {collaborators.map((collaborator) => (
              <li
                key={collaborator.id}
                className="flex items-center gap-x-2 border border-b-0 px-3 py-2 text-sm first:rounded-t-md last:rounded-b-md last:border-b"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={`https://unavatar.io/${collaborator.email}?fallback=false`}
                    alt={`${collaborator.email}'s avatar`}
                  />
                  <AvatarFallback className="text-muted-foreground text-xs font-medium uppercase">
                    {collaborator.email.split("@")[0].substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="truncate text-left font-medium">
                  {collaborator.email}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size="icon-xs"
                        variant="outline"
                        className="ml-auto"
                        disabled={
                          removing.includes(collaborator.id) ||
                          resending.includes(collaborator.id)
                        }
                      >
                        {removing.includes(collaborator.id) ||
                        resending.includes(collaborator.id) ? (
                          <Loader className="animate-spin" />
                        ) : (
                          <EllipsisVertical />
                        )}
                        <span className="sr-only">Collaborator actions</span>
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => void handleResendInvite(collaborator.id)}
                      disabled={
                        removing.includes(collaborator.id) ||
                        resending.includes(collaborator.id)
                      }
                    >
                      Resend invitation
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setPendingRemoveId(collaborator.id)}
                      disabled={
                        removing.includes(collaborator.id) ||
                        resending.includes(collaborator.id)
                      }
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>

          <AlertDialog
            open={Boolean(collaboratorToRemove)}
            onOpenChange={(open) => {
              if (!open) setPendingRemoveId(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove access to &quot;{owner}/{repo}&quot; for
                  &quot;{collaboratorToRemove?.email}&quot;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (!collaboratorToRemove) return;
                    void handleConfirmRemove(collaboratorToRemove.id);
                  }}
                >
                  Remove collaborator
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <div className="flex flex-1 items-center">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No collaborators</EmptyTitle>
              <EmptyDescription>
                Invite collaborators to give them access to this repository.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <InviteCollaboratorsDialog
                owner={owner}
                repo={repo}
                state={addCollaboratorState}
                action={addCollaboratorAction}
                open={inviteDialogOpen}
                onOpenChange={setInviteDialogOpen}
                value={emails}
                onValueChange={setEmails}
                disabled={isLoading}
                triggerLabel="Invite a collaborator"
                triggerVariant="default"
                triggerSize="default"
              />
            </EmptyContent>
          </Empty>
        </div>
      )}
    </div>
  );
}
