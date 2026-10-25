"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

type Lead = RouterOutputs["agency"]["leads"]["get"];

/**
 * Marking a lead won requires a deal value (0 is fine) because the value is
 * reported to Google Ads. The dialog deliberately doesn't touch notes, so an
 * unsaved draft in the side rail isn't clobbered.
 */
export function MarkWonDialog({
  repoId,
  lead,
  onClose,
  onDone,
}: {
  repoId: number;
  lead: Lead;
  onClose: () => void;
  onDone: (updated: Lead) => void;
}) {
  const trpc = useTRPC();
  const [value, setValue] = useState(
    lead.valueCents != null ? String(lead.valueCents / 100) : ""
  );
  const valueCents = value.trim() ? Math.round(Number(value) * 100) : null;
  const invalid =
    valueCents === null || !Number.isFinite(valueCents) || valueCents < 0;

  const update = useMutation(
    trpc.agency.leads.update.mutationOptions({
      onSuccess: (updated) => {
        toast.success("Marked as won.");
        onDone(updated);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as won</DialogTitle>
          <DialogDescription>
            The deal value is reported to Google Ads so bidding learns which
            clicks become paying customers. Enter 0 for a win with no revenue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="won-value">Deal value ({lead.currency})</Label>
          <div className="relative">
            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-[15px]">
              $
            </span>
            <Input
              id="won-value"
              autoFocus
              inputMode="decimal"
              placeholder="0"
              value={value}
              className="pl-7"
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={invalid || update.isPending}
            onClick={() =>
              update.mutate({ repoId, id: lead.id, status: "won", valueCents })
            }
          >
            Mark won
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Losing a lead takes an optional reason, kept for the funnel review. */
export function MarkLostDialog({
  repoId,
  lead,
  onClose,
  onDone,
}: {
  repoId: number;
  lead: Lead;
  onClose: () => void;
  onDone: (updated: Lead) => void;
}) {
  const trpc = useTRPC();
  const [reason, setReason] = useState(lead.lostReason ?? "");

  const update = useMutation(
    trpc.agency.leads.update.mutationOptions({
      onSuccess: (updated) => {
        toast.success("Marked as lost.");
        onDone(updated);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as lost</DialogTitle>
          <DialogDescription>
            A short reason helps spot patterns later: wrong service, out of
            area, price, went quiet.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lost-reason">Why was this lead lost? (optional)</Label>
          <Textarea
            id="lost-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                repoId,
                id: lead.id,
                status: "lost",
                lostReason: reason.trim() || null,
              })
            }
          >
            Mark lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
