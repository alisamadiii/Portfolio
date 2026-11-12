"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

import { useTRPC } from "@workspace/trpc/client";

import { useAgency, useAgencyHref } from "@/components/agency/use-agency";
import { Plus } from "@/components/icon";
import { Button as DsButton } from "@/components/ds/ui/button";
import { Field, Input, Textarea } from "@/components/ds/ui/field";

// Phone calls and walk-ins don't come through the website form; logging them
// here keeps the numbers (and the closed-deal reporting) complete.
export function NewLeadDialog() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { projectId } = useAgency();
  const href = useAgencyHref();
  const [open, setOpen] = useState(false);

  const create = useMutation(
    trpc.agency.leads.create.mutationOptions({
      onSuccess: (lead) => {
        queryClient.invalidateQueries({ queryKey: trpc.agency.leads.pathKey() });
        setOpen(false);
        router.push(href(`/leads/${lead.id}`));
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <DsButton variant="primary" icon={<Plus className="size-4" />}>
            Add lead
          </DsButton>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
          <DialogDescription>
            For calls and walk-ins that didn&apos;t come through the website.
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-lead"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            create.mutate({
              projectId,
              name: String(form.get("name") ?? ""),
              email: String(form.get("email") ?? ""),
              phone: String(form.get("phone") ?? ""),
              message: String(form.get("message") ?? ""),
            });
          }}
        >
          <Field label="Name">
            <Input name="name" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input name="phone" type="tel" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea name="message" rows={3} />
          </Field>
        </form>
        <DialogFooter>
          <DsButton variant="primary" type="submit" form="new-lead" disabled={create.isPending}>
            Add lead
          </DsButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
