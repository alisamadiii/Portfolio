"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { GoogleCalendarLogo } from "@/components/ds/brand-logos";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { useInstalledApps } from "@/hooks/use-installed-apps";
import { repoPath } from "@/lib/paths";
import { handleCmsError } from "@/lib/trpc-errors";

import { ScheduleMeetingDialog } from "./schedule-meeting-dialog";

type Lead = RouterOutputs["agency"]["leads"]["get"];

/**
 * Whether this project can book on Google Calendar: the app is installed and
 * connected. Drives the lead's Schedule button.
 */
function useCalendarReady(projectId: string) {
  const trpc = useTRPC();
  const { isInstalled, isLoaded } = useInstalledApps(projectId);
  const installed = isInstalled("gcal");
  const status = useQuery(
    trpc.gcal.status.queryOptions({ projectId }, { enabled: installed, retry: false })
  );
  return {
    loading: !isLoaded || (installed && status.isPending),
    installed,
    connected: installed && !!status.data?.connected,
  };
}

/** Header "Schedule" button: books, or explains how to set up Google Calendar first. */
export function ScheduleButton({
  projectId,
  lead,
  onSaved,
}: {
  projectId: string;
  lead: Lead;
  onSaved: (updated: Lead) => void;
}) {
  const calendar = useCalendarReady(projectId);
  const [open, setOpen] = useState<"schedule" | "setup" | null>(null);

  return (
    <>
      <Button
        variant="outline"
        disabled={calendar.loading}
        onClick={() => setOpen(calendar.connected ? "schedule" : "setup")}
      >
        <CalendarClock className="size-4" />
        {lead.meetingAt ? "Reschedule" : "Schedule"}
      </Button>
      {open === "schedule" && (
        <ScheduleMeetingDialog
          projectId={projectId}
          lead={lead}
          onClose={() => setOpen(null)}
          onDone={(updated) => {
            setOpen(null);
            onSaved(updated);
          }}
        />
      )}
      {open === "setup" && (
        <CalendarSetupDialog
          projectId={projectId}
          installed={calendar.installed}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

/** Calendar isn't ready: add the app (if needed) and go connect it. */
function CalendarSetupDialog({
  projectId,
  installed,
  onClose,
}: {
  projectId: string;
  installed: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { install, isPending } = useInstalledApps(projectId);
  const calendarPage = repoPath(projectId, "calendar");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <span className="mb-1 grid size-10 place-items-center rounded-control border border-line bg-surface">
            <GoogleCalendarLogo className="size-5" />
          </span>
          <DialogTitle>{installed ? "Connect Google Calendar" : "Add Google Calendar first"}</DialogTitle>
          <DialogDescription>
            {installed
              ? "Connect your Google Calendar so we can schedule appointments for this lead. You'll come back here after."
              : "You need to install and connect your Google Calendar so we can schedule appointments for this lead. It's free on every plan."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Not now
          </Button>
          <Button
            disabled={isPending}
            onClick={() =>
              installed
                ? router.push(calendarPage)
                : install("gcal", { onSuccess: () => router.push(calendarPage) })
            }
          >
            {installed ? "Connect Google Calendar" : isPending ? "Adding…" : "Add and connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Right-rail card for the lead's booked appointment. */
export function MeetingCard({
  projectId,
  lead,
  canEdit,
  onSaved,
}: {
  projectId: string;
  lead: Lead;
  canEdit: boolean;
  onSaved: (updated: Lead) => void;
}) {
  const trpc = useTRPC();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const cancel = useMutation(
    trpc.agency.leads.cancelMeeting.mutationOptions({
      onSuccess: (updated) => {
        toast.success("Meeting canceled.");
        onSaved(updated);
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't cancel the meeting.")),
    })
  );

  if (!lead.meetingAt) return null;
  const start = new Date(lead.meetingAt);
  const end = lead.meetingEndAt ? new Date(lead.meetingEndAt) : null;
  const past = (end ?? start) < new Date();

  return (
    <div className="flex flex-col gap-2 rounded-[12px] bg-foreground/[0.03] p-4 ring-1 ring-foreground/7">
      <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <GoogleCalendarLogo className="size-4" />
        {past ? "Last meeting" : "Upcoming meeting"}
      </p>
      <p className="text-[15px] font-semibold">{format(start, "EEEE, MMMM d")}</p>
      <p className="text-[14px] text-muted-foreground">
        {format(start, "h:mm a")}
        {end && ` – ${format(end, "h:mm a")}`}
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        {lead.meetingUrl && (
          <Button size="sm" variant="outline" render={<a href={lead.meetingUrl} target="_blank" rel="noreferrer" />}>
            <ExternalLink className="size-3.5" />
            Open
          </Button>
        )}
        {canEdit && (
          <>
            <Button size="sm" variant="outline" onClick={() => setRescheduling(true)}>
              Reschedule
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={cancel.isPending}
              onClick={() => setConfirmCancel(true)}
            >
              {cancel.isPending ? "Canceling…" : "Cancel"}
            </Button>
          </>
        )}
      </div>
      {rescheduling && (
        <ScheduleMeetingDialog
          projectId={projectId}
          lead={lead}
          onClose={() => setRescheduling(false)}
          onDone={(updated) => {
            setRescheduling(false);
            onSaved(updated);
          }}
        />
      )}
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this meeting?"
        description={`The event is removed from Google Calendar${lead.email ? ` and ${lead.email} gets a cancellation email` : ""}.`}
        confirmLabel="Cancel meeting"
        cancelLabel="Keep it"
        danger
        onConfirm={() => cancel.mutate({ projectId, id: lead.id })}
      />
    </div>
  );
}
