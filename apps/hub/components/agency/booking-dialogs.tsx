"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Skeleton } from "@workspace/ui/components/skeleton";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

export type Booking = RouterOutputs["agency"]["booking"]["list"][number];

// The dialogs only need these fields, so a lead (from leads.get) works too.
type BookingLike = {
  id: number;
  name?: string | null;
  email?: string | null;
  booking?: { typeName?: string | null } | null;
};

/** Confirm + run the cancel mutation for one booking. */
export function CancelBookingDialog({
  projectId,
  booking,
  onClose,
  onDone,
}: {
  projectId: string;
  booking: BookingLike;
  onClose: () => void;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const cancel = useMutation(
    trpc.agency.booking.cancel.mutationOptions({
      onSuccess: () => {
        toast.success("Booking canceled. The visitor was notified.");
        onDone();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            {booking.name ?? "The visitor"} gets a cancellation email from
            Google Calendar and the slot opens up again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate({ projectId, leadId: booking.id })}
          >
            Cancel booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Pick a new slot and move the booking. */
export function RescheduleDialog({
  projectId,
  booking,
  onClose,
  onDone,
}: {
  projectId: string;
  booking: BookingLike;
  onClose: () => void;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const range = useMemo(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);
  const slots = useQuery(
    trpc.agency.booking.slots.queryOptions({ projectId, ...range })
  );
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const reschedule = useMutation(
    trpc.agency.booking.reschedule.mutationOptions({
      onSuccess: () => {
        toast.success("Booking moved. Both sides were notified.");
        onDone();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const byDay = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const iso of slots.data?.slots ?? []) {
      const key = format(new Date(iso), "yyyy-MM-dd");
      groups.set(key, [...(groups.get(key) ?? []), iso]);
    }
    return groups;
  }, [slots.data]);
  const days = [...byDay.keys()];
  const activeDay = day ?? days[0] ?? null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reschedule {booking.booking?.typeName}</DialogTitle>
          <DialogDescription>
            Pick a new time for {booking.name ?? booking.email}. The calendar
            invite moves and both of you get the update.
          </DialogDescription>
        </DialogHeader>
        {slots.isPending ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : !days.length ? (
          <p className="text-muted-foreground py-6 text-center text-[14px]">
            No free times in the next two weeks.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => (
                <Button
                  key={d}
                  variant={d === activeDay ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDay(d);
                    setSlot(null);
                  }}
                >
                  {format(new Date(`${d}T12:00:00`), "EEE d")}
                </Button>
              ))}
            </div>
            <div className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto">
              {(activeDay ? (byDay.get(activeDay) ?? []) : []).map((iso) => (
                <Button
                  key={iso}
                  variant={slot === iso ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlot(iso)}
                >
                  {format(new Date(iso), "p")}
                </Button>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            disabled={!slot || reschedule.isPending}
            onClick={() =>
              slot && reschedule.mutate({ projectId, leadId: booking.id, at: slot })
            }
          >
            Move booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
