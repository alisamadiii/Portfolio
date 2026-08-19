"use client";

import { useActionState, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import { ArrowUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

import { useUser } from "@/contexts/user-context";
import { isAdminUser } from "@/lib/authz-shared";
import {
  handleAddCollaborator,
  handleRemoveCollaborator,
} from "@/lib/actions/collaborator";
import { getInitialsFromName } from "@/lib/utils/avatar";

type Collaborator = { id: number; email: string };

type AddState = {
  message?: string;
  error?: string;
  errors?: string[];
  data?: Collaborator[];
};

/**
 * Header Invite — admin only. Framer-style popover: one email field + send,
 * then the list of people with access to this repo. Reuses the collaborator
 * server actions and list query (no modal).
 */
export function InviteButton({ owner, repo }: { owner: string; repo: string }) {
  const { user } = useUser();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [state, action, pending] = useActionState<AddState, FormData>(
    handleAddCollaborator,
    {}
  );
  const [email, setEmail] = useState("");
  const [removing, setRemoving] = useState<number[]>([]);

  const collaboratorsQuery = useQuery(
    trpc.cms.collaborators.list.queryOptions(
      { owner, repo },
      { enabled: isAdminUser(user) }
    )
  );
  const collaborators = (collaboratorsQuery.data ?? []) as Collaborator[];

  const setCollaborators = (updater: (prev: Collaborator[]) => Collaborator[]) =>
    queryClient.setQueryData<Collaborator[]>(
      trpc.cms.collaborators.list.queryKey({ owner, repo }),
      (prev) => updater(prev ?? [])
    );

  useEffect(() => {
    if (!state?.message) return;
    toast.success(state.message, { duration: 8000 });
    if (Array.isArray(state.errors) && state.errors.length > 0)
      toast.error(state.errors.join("\n"), { duration: 8000 });
    if (Array.isArray(state.data) && state.data.length > 0) {
      const fresh = state.data;
      setCollaborators((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...fresh.filter((c) => !seen.has(c.id))];
      });
    }
    setEmail("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (state?.error) toast.error(state.error, { duration: 8000 });
  }, [state?.error]);

  const remove = async (id: number) => {
    setRemoving((prev) => [...prev, id]);
    try {
      const res = await handleRemoveCollaborator(id, owner, repo);
      if (res.error) toast.error(res.error);
      else {
        setCollaborators((prev) => prev.filter((c) => c.id !== id));
        if (res.message) toast.success(res.message);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to remove.");
    } finally {
      setRemoving((prev) => prev.filter((x) => x !== id));
    }
  };

  if (!isAdminUser(user)) return null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            Invite
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 gap-3">
        <PopoverTitle>Invite</PopoverTitle>

        <form
          action={action}
          className="flex items-center gap-1.5"
        >
          <input type="hidden" name="owner" value={owner} />
          <input type="hidden" name="repo" value={repo} />
          <Input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.com"
            className="h-9 flex-1"
            required
          />
          <Button
            type="submit"
            size="icon-sm"
            className="size-9 shrink-0"
            disabled={pending || email.trim().length === 0}
            aria-label="Send invite"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </Button>
        </form>

        <div className="bg-border h-px" />

        <ul className="flex flex-col gap-0.5">
          {/* Owner (current admin) */}
          {user && (
            <li className="flex items-center gap-2.5 rounded-md px-1 py-1.5">
              <Avatar className="size-7">
                <AvatarImage
                  src={`https://unavatar.io/${user.email}?fallback=false`}
                  alt={user.name || user.email}
                />
                <AvatarFallback className="text-xs">
                  {getInitialsFromName(user.name ?? undefined)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {user.name || user.email}
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {user.email}
                </div>
              </div>
              <span className="text-muted-foreground text-xs">Owner</span>
            </li>
          )}

          {/* Collaborators */}
          {collaborators.map((collaborator) => (
            <li
              key={collaborator.id}
              className="group hover:bg-muted/60 flex items-center gap-2.5 rounded-md px-1 py-1.5"
            >
              <Avatar className="size-7">
                <AvatarImage
                  src={`https://unavatar.io/${collaborator.email}?fallback=false`}
                  alt={collaborator.email}
                />
                <AvatarFallback className="text-xs uppercase">
                  {collaborator.email.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 truncate text-sm">
                {collaborator.email}
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                onClick={() => void remove(collaborator.id)}
                disabled={removing.includes(collaborator.id)}
                aria-label={`Remove ${collaborator.email}`}
              >
                {removing.includes(collaborator.id) ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
