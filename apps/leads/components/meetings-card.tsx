"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, Phone } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

const STATUS_TONES: Record<string, string> = {
  meeting: "bg-blue-100 text-blue-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-600",
  interested: "bg-amber-100 text-amber-700",
  contacted: "bg-violet-100 text-violet-700",
  new: "bg-muted text-muted-foreground",
};

type Meeting = {
  id: number;
  scanId: number;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  meetingAt: Date | string | null;
  meetingUrl: string | null;
};

const MeetingRow = ({ meeting, past }: { meeting: Meeting; past: boolean }) => {
  const at = new Date(meeting.meetingAt!);
  return (
    <li>
      <Link
        href={`/scans/${meeting.scanId}?lead=${meeting.id}`}
        className={`hover:bg-muted/70 flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition-colors ${past ? "opacity-60" : ""}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Calendar-tile date, Google blue for upcoming, muted for past. */}
          <span
            className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-xl ${
              past
                ? "bg-muted text-muted-foreground"
                : "bg-[#e8f0fe] text-[#1a73e8]"
            }`}
          >
            <span className="text-[10px] leading-none font-semibold tracking-wide uppercase">
              {at.toLocaleDateString(undefined, { month: "short" })}
            </span>
            <span className="text-base leading-tight font-bold">
              {at.getDate()}
            </span>
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{meeting.name}</p>
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <span>
                {at.toLocaleDateString(undefined, { weekday: "short" })}{" "}
                {at.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              {meeting.phone && (
                <span className="flex items-center gap-1 max-sm:hidden">
                  <Phone className="size-3" /> {meeting.phone}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize max-sm:hidden ${
              STATUS_TONES[meeting.status] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {meeting.status}
          </span>
          {meeting.meetingUrl && (
            // Button, not <a> — anchors can't nest inside the row Link.
            <button
              aria-label="Open in Google Calendar"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(meeting.meetingUrl!, "_blank", "noopener");
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors"
            >
              <ExternalLink className="size-4" />
            </button>
          )}
        </div>
      </Link>
    </li>
  );
};

export const MeetingsCard = () => {
  const trpc = useTRPC();
  const meetings = useQuery(trpc.leads.meetings.queryOptions());

  const rows = meetings.data ?? [];

  const now = Date.now();
  // Query returns newest-first; upcoming reads better soonest-first.
  const upcoming = rows
    .filter((m) => new Date(m.meetingAt!).getTime() >= now)
    .reverse();
  const past = rows.filter((m) => new Date(m.meetingAt!).getTime() < now);

  return (
    <div className="bg-card flex h-80 flex-col rounded-3xl p-6 shadow-sm sm:p-7">
      <div className="mb-4 flex items-center gap-3">
        <span className="icon-chip bg-[#e8f0fe] text-[#1a73e8]">
          <CalendarDays />
        </span>
        <h2 className="text-lg font-semibold tracking-tight">Meetings</h2>
        {upcoming.length > 0 && (
          <span className="rounded-full bg-[#e8f0fe] px-3 py-1 text-xs font-semibold text-[#1a73e8]">
            {upcoming.length} upcoming
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!rows.length && (
          <p className="text-muted-foreground text-sm">
            {meetings.isLoading
              ? "Loading…"
              : "No meetings yet. Open a lead, hit Start, and schedule one through Google Calendar."}
          </p>
        )}
        {upcoming.length > 0 && (
          <ul className="space-y-1">
            {upcoming.map((m) => (
              <MeetingRow key={m.id} meeting={m} past={false} />
            ))}
          </ul>
        )}
        {past.length > 0 && (
          <>
            <p className="text-muted-foreground mt-4 mb-1 px-3 text-xs font-semibold tracking-wide uppercase">
              Past
            </p>
            <ul className="space-y-1">
              {past.map((m) => (
                <MeetingRow key={m.id} meeting={m} past />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};
