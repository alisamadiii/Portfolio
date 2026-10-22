"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";

import { useAgency } from "@/components/agency/use-agency";
import { Plus } from "@/components/icon";

// Phone calls and walk-ins don't come through the website form; logging them
// here keeps the numbers (and the closed-deal reporting) complete.
export function NewLeadDialog() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { repoId } = useAgency();
  const [open, setOpen] = useState(false);

  const create = useMutation(
    trpc.agency.leads.create.mutationOptions({
      onSuccess: (lead) => {
        queryClient.invalidateQueries({ queryKey: trpc.agency.leads.pathKey() });
        setOpen(false);
        router.push(`/agency/${lead.id}`);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Add lead
          </Button>
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
              repoId,
              name: String(form.get("name") ?? ""),
              email: String(form.get("email") ?? ""),
              phone: String(form.get("phone") ?? ""),
              message: String(form.get("message") ?? ""),
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Name</Label>
            <Input id="lead-name" name="name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input id="lead-phone" name="phone" type="tel" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" name="email" type="email" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-message">Notes</Label>
            <Textarea id="lead-message" name="message" rows={3} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="new-lead" disabled={create.isPending}>
            Add lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
