"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

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
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useTRPC } from "@workspace/trpc/client";

import { Button, IconButton } from "@/components/ds/ui/button";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { Field, Input } from "@/components/ds/ui/field";

import { useNewsletter } from "./use-newsletter";

/** "New list": a contact list (folder) in the project's workspace. */
export function NewListDialog({ onCreated }: { onCreated: (listId: string) => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useNewsletter();
  const [open, setOpen] = useState(false);
  const create = useMutation(
    trpc.newsletter.contacts.createList.mutationOptions({
      onSuccess: async (list) => {
        await queryClient.invalidateQueries({ queryKey: trpc.newsletter.contacts.lists.queryKey({ projectId }) });
        setOpen(false);
        onCreated(list.id);
        toast.success(`List "${list.name}" created`);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" icon={<Plus className="size-3.5" />}>New list</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New list</DialogTitle>
          <DialogDescription>
            Group contacts, like customers, volunteers or event sign-ups, and send campaigns to one list.
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-list"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate({ projectId, name: String(new FormData(event.currentTarget).get("name") ?? "") });
          }}
        >
          <Field label="List name">
            <Input name="name" required maxLength={100} placeholder="Volunteers" autoFocus />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="primary" type="submit" form="new-list" disabled={create.isPending}>
            Create list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Rename / delete the list being viewed. */
export function ListMenu({
  list,
  canDelete,
  onDeleted,
}: {
  list: { id: string; name: string; total: number };
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useNewsletter();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.newsletter.pathKey() });

  const rename = useMutation(
    trpc.newsletter.contacts.renameList.mutationOptions({
      onSuccess: () => {
        setRenaming(false);
        void refresh();
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const remove = useMutation(
    trpc.newsletter.contacts.deleteList.mutationOptions({
      onSuccess: () => {
        toast.success(`List "${list.name}" deleted`);
        onDeleted();
        void refresh();
      },
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<IconButton aria-label="List options" className="size-8"><MoreHorizontal className="size-4" /></IconButton>} />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setRenaming(true)}>Rename list</DropdownMenuItem>
          {canDelete && (
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
              Delete list
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename list</DialogTitle>
          </DialogHeader>
          <form
            id="rename-list"
            onSubmit={(event) => {
              event.preventDefault();
              rename.mutate({
                projectId,
                listId: list.id,
                name: String(new FormData(event.currentTarget).get("name") ?? ""),
              });
            }}
          >
            <Field label="List name">
              <Input name="name" required maxLength={100} defaultValue={list.name} autoFocus />
            </Field>
          </form>
          <DialogFooter>
            <Button variant="primary" type="submit" form="rename-list" disabled={rename.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        danger
        title={`Delete "${list.name}"?`}
        description={`This permanently deletes the list and its ${list.total.toLocaleString()} contact${list.total === 1 ? "" : "s"}. Contacts that are also on other lists stay there. This can't be undone.`}
        confirmLabel="Delete list"
        onConfirm={() => remove.mutate({ projectId, listId: list.id })}
      />
    </>
  );
}
