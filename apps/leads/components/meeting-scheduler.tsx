"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarPlus,
  ChevronDown,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Calendar } from "@workspace/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { queryClient, useTRPC } from "@workspace/trpc/client";

import { connectGoogleCalendar } from "@/lib/google-calendar";

// 15-min slots, 8:00 through 17:45.
const TIME_SLOTS = Array.from({ length: 40 }, (_, i) => {
  const hour = 8 + Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

const slotLabel = (slot: string) => {
  const [h, m] = slot.split(":").map(Number);
  const hour12 = ((h! + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`;
};

const DURATIONS = [15, 30, 60] as const;

const GoogleCalendarMark = (
  <svg className="size-7" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2.5" fill="#fff" stroke="#dadce0" />
    <path
      fill="#1a73e8"
      d="M5.5 3h13A2.5 2.5 0 0 1 21 5.5V7.5H3V5.5A2.5 2.5 0 0 1 5.5 3z"
    />
    <text
      x="12"
      y="17.5"
      textAnchor="middle"
      fontSize="9"
      fontWeight="700"
      fill="#1a73e8"
      fontFamily="system-ui, sans-serif"
    >
      31
    </text>
  </svg>
);

// Google Calendar branded shell shared by every state of the block.
const CalendarCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-3 rounded-2xl border border-[#dadce0] bg-white p-4">
    <div className="flex items-center gap-2.5">
      <span className="flex size-12 items-center justify-center rounded-xl border border-[#dadce0] bg-[#f8fafd]">
        {GoogleCalendarMark}
      </span>
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-[#1a73e8] uppercase">
          Google Calendar
        </p>
        <p className="text-sm font-medium">{title}</p>
      </div>
    </div>
    {children}
  </div>
);

export const MeetingScheduler = ({
  leadId,
  email,
  meetingAt,
  meetingUrl,
}: {
  leadId: number;
  email: string;
  meetingAt: Date | null;
  meetingUrl: string | null;
}) => {
  const trpc = useTRPC();

  const [date, setDate] = useState<Date | undefined>();
  const [dateOpen, setDateOpen] = useState(false);
  const [slot, setSlot] = useState("10:00");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(30);
  const [rescheduling, setRescheduling] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const status = useQuery(trpc.integrations.status.queryOptions());
  const connected = !!status.data?.find(
    (row) => row.id === "google-calendar" && row.connected && !row.needsReconnect
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.leads.list.queryKey() });
    queryClient.invalidateQueries({
      queryKey: trpc.leads.meetings.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.integrations.status.queryKey(),
    });
  };

  const schedule = useMutation(
    trpc.leads.scheduleMeeting.mutationOptions({
      onSuccess: () => {
        invalidate();
        setRescheduling(false);
        toast.success("Meeting scheduled. Invite sent.");
      },
      onError: (error) => {
        // Reconnect errors flip the UI back to the Connect button.
        invalidate();
        toast.error(error.message);
      },
    })
  );
  const cancel = useMutation(
    trpc.leads.cancelMeeting.mutationOptions({
      onSuccess: () => {
        invalidate();
        toast.success("Meeting canceled");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const connect = async () => {
    setConnecting(true);
    // Google redirects back here after consent.
    const error = await connectGoogleCalendar(window.location.href);
    if (error) {
      setConnecting(false);
      toast.error(error.message ?? "Could not start Google sign-in");
    }
  };

  if (!status.isLoading && !connected) {
    return (
      <CalendarCard title="Schedule a meeting">
        <p className="text-muted-foreground text-sm">
          Connect your Google Calendar once, then book meetings with leads
          right from here. Invites go out automatically.
        </p>
        <button
          className="btn-pill h-9 bg-[#1a73e8] px-4 text-sm font-medium text-white hover:bg-[#1765cc] [&_svg]:size-4"
          disabled={connecting}
          onClick={connect}
        >
          {connecting ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
          Connect Google Calendar
        </button>
      </CalendarCard>
    );
  }

  if (meetingAt && !rescheduling) {
    return (
      <CalendarCard title="Meeting scheduled">
        {/* Google Calendar event-chip look: blue bar + tinted row. */}
        <div className="flex items-center gap-3 rounded-lg border-l-4 border-[#1a73e8] bg-[#e8f0fe] px-3 py-2.5">
          <CalendarCheck className="size-4 shrink-0 text-[#1a73e8]" />
          <p className="text-sm font-medium text-[#174ea6]">
            {meetingAt.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            at{" "}
            {meetingAt.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {meetingUrl && (
            <a
              href={meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-pill btn-light h-8 px-3 text-xs [&_svg]:size-3.5"
            >
              <ExternalLink /> Open in Google Calendar
            </a>
          )}
          <button
            className="btn-pill btn-light h-8 px-3 text-xs"
            onClick={() => setRescheduling(true)}
          >
            Reschedule
          </button>
          <button
            className="btn-pill btn-light h-8 px-3 text-xs text-rose-600"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate({ id: leadId })}
          >
            {cancel.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Cancel meeting
          </button>
        </div>
      </CalendarCard>
    );
  }

  return (
    <CalendarCard
      title={rescheduling ? "Reschedule meeting" : "Schedule a meeting"}
    >
      <div className="flex flex-wrap gap-2">
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger
            render={
              <button className="flex h-10 items-center gap-2 rounded-full border border-[#dadce0] bg-[#f8fafd] px-4 text-sm">
                {date
                  ? date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : "Pick a date"}
                <ChevronDown className="text-muted-foreground size-3.5" />
              </button>
            }
          />
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selected) => {
                setDate(selected);
                setDateOpen(false);
              }}
              disabled={{ before: new Date() }}
            />
          </PopoverContent>
        </Popover>
        <Select value={slot} onValueChange={(v) => v && setSlot(v)}>
          <SelectTrigger className="w-28 rounded-full border-[#dadce0] bg-[#f8fafd] data-[size=default]:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((s) => (
              <SelectItem key={s} value={s}>
                {slotLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(duration)}
          onValueChange={(v) =>
            v && setDuration(Number(v) as (typeof DURATIONS)[number])
          }
        >
          <SelectTrigger className="w-26 rounded-full border-[#dadce0] bg-[#f8fafd] data-[size=default]:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATIONS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d} min
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!emailValid && (
        <p className="text-muted-foreground text-xs">
          Add the lead&apos;s email above first. The calendar invite is sent to
          it.
        </p>
      )}
      <div className="flex gap-2">
        <button
          className="btn-pill h-9 bg-[#1a73e8] px-4 text-sm font-medium text-white hover:bg-[#1765cc] disabled:opacity-50 [&_svg]:size-4"
          disabled={!date || !emailValid || schedule.isPending}
          onClick={() => {
            if (!date) return;
            const [h, m] = slot.split(":").map(Number);
            const startsAt = new Date(date);
            startsAt.setHours(h!, m!, 0, 0);
            schedule.mutate({
              id: leadId,
              startsAt: startsAt.toISOString(),
              durationMinutes: duration,
              email,
            });
          }}
        >
          {schedule.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <CalendarPlus />
          )}
          Schedule
        </button>
        {rescheduling && (
          <button
            className="btn-pill btn-light h-9 px-4 text-sm"
            onClick={() => setRescheduling(false)}
          >
            Keep current time
          </button>
        )}
      </div>
    </CalendarCard>
  );
};
