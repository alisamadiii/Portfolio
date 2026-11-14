"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
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

/**
 * Import a design into Sites as a real (upload) project. No email = Ali's own
 * project; a client email = created under that client's Hub account.
 */
export function ImportDialog({
  open,
  onOpenChange,
  slug,
  defaultName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  defaultName: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState("");

  const run = useMutation(
    trpc.clientWebsites.import.mutationOptions({
      onSuccess: (project) => {
        void queryClient.invalidateQueries({ queryKey: trpc.cms.repos.listMine.queryKey() });
        onOpenChange(false);
        if (project.mine) {
          toast.success(`Imported as ${project.name}.`);
          router.push(`/p/${project.projectId}`);
        } else {
          toast.success(`Imported as ${project.name} for ${project.ownerEmail}.`);
        }
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't import this website.")),
    })
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !run.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Import into Sites</DialogTitle>
          <DialogDescription>
            Creates a project from this design&apos;s files, ready to edit and publish. The presentation, video and
            _meta.json stay out.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const clientEmail = email.trim();
            run.mutate({ slug, name: name.trim(), clientEmail: clientEmail || undefined });
          }}
        >
          <Field label="Project name">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </Field>
          <Field
            label="Client email"
            optional
            hint="Leave empty to add it to your own Sites. With an email, it goes to that client's Hub account."
          >
            <Input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" disabled={run.isPending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!name.trim() || run.isPending}>
              {run.isPending ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
