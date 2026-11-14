"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { InspirationFolder } from "@workspace/trpc/lib/inspiration-shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { Button } from "@/components/ds/ui/button";
import { Field, Input } from "@/components/ds/ui/field";
import { handleCmsError } from "@/lib/trpc-errors";

/** New folder inside `parent` (or at the top). It goes last in its parent. */
export function FolderDialog({
  open,
  onOpenChange,
  parent,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: InspirationFolder | null;
  onCreated: (path: string) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const create = useMutation(
    trpc.inspiration.createFolder.mutationOptions({
      onSuccess: ({ path }) => {
        void queryClient.invalidateQueries({ queryKey: trpc.inspiration.library.queryKey() });
        setTitle("");
        onOpenChange(false);
        onCreated(path);
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't create the folder.")),
    })
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>{parent ? `Inside ${parent.title}.` : "At the top level."}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ parent: parent?.path ?? "", title: title.trim() });
          }}
        >
          <Field label="Name">
            <Input
              autoFocus
              value={title}
              maxLength={80}
              placeholder="e.g. Pricing tables"
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!title.trim() || create.isPending}>
              Create folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
