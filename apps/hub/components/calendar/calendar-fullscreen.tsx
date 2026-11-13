"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  addDays,
  addWeeks,
  differenceInMinutes,
  endOfDay,
  format,
  isSameDay,
  isToday,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, Users, Video, X } from "lucide-react";
import { motion } from "motion/react";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { cn } from "@workspace/ui/lib/utils";

import { Button, ButtonAnchor, IconButton } from "@/components/ds/ui/button";
import { handleCmsError } from "@/lib/trpc-errors";

type Calendar = RouterOutputs["gcal"]["calendars"][number];
type CalEvent = RouterOutputs["gcal"]["events"][number];

const HOUR_PX = 48;
const DAY_PX = 24 * HOUR_PX;

// All-day events carry a bare date ("2026-11-13"): parse it as local midnight.
const toDate = (value: string) => (value.length === 10 ? parseISO(`${value}T00:00:00`) : parseISO(value));

type Placed = { event: CalEvent; top: number; height: number; lane: number; lanes: number };

/** Timed events of one day, positioned, overlapping ones side by side. */
function layoutDay(events: CalEvent[], day: Date): Placed[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const items = events
    .filter((e) => !e.allDay)
    .map((event) => {
      const start = maxDate([toDate(event.start), dayStart]);
      const end = minDate([toDate(event.end), dayEnd]);
      return { event, start, end };
    })
    .filter((e) => e.end > e.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime());

  const placed: Placed[] = [];
  // Clusters of transitively overlapping events share a lane count.
  let cluster: (Placed & { endMs: number })[] = [];
  let clusterEnd = 0;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((p) => p.lane + 1));
    for (const p of cluster) placed.push({ ...p, lanes });
    cluster = [];
  };
  for (const item of items) {
    if (cluster.length && item.start.getTime() >= clusterEnd) flush();
    const laneEnds: number[] = [];
    for (const p of cluster) laneEnds[p.lane] = Math.max(laneEnds[p.lane] ?? 0, p.endMs);
    let lane = laneEnds.findIndex((end) => end <= item.start.getTime());
    if (lane === -1) lane = laneEnds.length;
    const minutes = differenceInMinutes(item.start, dayStart);
    cluster.push({
      event: item.event,
      top: (minutes / 60) * HOUR_PX,
      height: Math.max(18, (differenceInMinutes(item.end, item.start) / 60) * HOUR_PX - 2),
      lane,
      lanes: 1,
      endMs: item.end.getTime(),
    });
    clusterEnd = Math.max(clusterEnd, item.end.getTime());
  }
  if (cluster.length) flush();
  return placed;
}

const timeRange = (e: CalEvent) => {
  if (e.allDay) {
    const start = toDate(e.start);
    // All-day end dates are exclusive.
    const last = addDays(toDate(e.end), -1);
    return isSameDay(start, last)
      ? `${format(start, "EEEE, MMMM d")} · All day`
      : `${format(start, "MMM d")} – ${format(last, "MMM d")} · All day`;
  }
  const start = toDate(e.start);
  const end = toDate(e.end);
  return isSameDay(start, end)
    ? `${format(start, "EEEE, MMMM d")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`
    : `${format(start, "MMM d, h:mm a")} – ${format(end, "MMM d, h:mm a")}`;
};

/** Full-screen week view of one calendar. Read-only. */
export function CalendarFullscreen({
  projectId,
  calendar,
  onClose,
}: {
  projectId: string;
  calendar: Calendar;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState<CalEvent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const events = useQuery(
    trpc.gcal.events.queryOptions(
      {
        projectId,
        calendarId: calendar.id,
        from: weekStart.toISOString(),
        to: addDays(weekStart, 7).toISOString(),
      },
      { placeholderData: keepPreviousData, retry: false }
    )
  );
  const list = useMemo(() => events.data ?? [], [events.data]);
  const allDay = list.filter((e) => e.allDay);
  const color = calendar.color ?? undefined;

  // Esc closes the event card first, then the view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selected) setSelected(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onClose]);

  // No page scroll behind the overlay.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Open on the working day (7am), not midnight.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 7 * HOUR_PX });
  }, []);

  const now = new Date();
  const nowTop = (differenceInMinutes(now, startOfDay(now)) / 60) * HOUR_PX;
  const sameMonth = days[0]!.getMonth() === days[6]!.getMonth();
  const range = sameMonth
    ? `${format(days[0]!, "MMMM d")} – ${format(days[6]!, "d, yyyy")}`
    : `${format(days[0]!, "MMM d")} – ${format(days[6]!, "MMM d, yyyy")}`;

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={calendar.name}
      initial={{ opacity: 0, filter: "blur(6px)", scale: 0.985 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      exit={{ opacity: 0, filter: "blur(6px)", scale: 0.985 }}
      transition={{ type: "spring", duration: 0.35, bounce: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-canvas text-ink"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 md:px-6">
        <span
          className="size-3 shrink-0 rounded-full bg-faint"
          style={color ? { backgroundColor: color } : undefined}
        />
        <h2 className="min-w-0 truncate text-base font-semibold">{calendar.name}</h2>
        <div className="ml-auto flex items-center gap-2 md:ml-6">
          <Button size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Today
          </Button>
          <IconButton aria-label="Previous week" onClick={() => setWeekStart((w) => addWeeks(w, -1))}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <IconButton aria-label="Next week" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
            <ChevronRight className="size-4" />
          </IconButton>
          <span className="hidden text-sm font-medium sm:inline">{range}</span>
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          {events.isFetching && <span className="text-[13px] text-dim">Loading…</span>}
          <IconButton aria-label="Close calendar" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
      </div>

      {events.isError && (
        <p className="border-b border-line bg-danger-soft px-6 py-2 text-[13px] text-danger">
          {handleCmsError(events.error, "Couldn't load events.")}
        </p>
      )}

      {/* Week grid: scrolls both ways on small screens. */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div className="min-w-[760px]">
          {/* Day headers + all-day strip */}
          <div className="sticky top-0 z-20 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line bg-surface">
            <div />
            {days.map((day) => (
              <div key={day.toISOString()} className="flex flex-col items-center gap-0.5 border-l border-divider py-2">
                <span className="text-[12px] text-dim">{format(day, "EEE")}</span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                    isToday(day) && "bg-coral text-ink"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
            ))}
            {allDay.length > 0 && (
              <>
                <div className="flex items-start justify-end pr-2 pt-1 text-[11px] text-faint">All day</div>
                {days.map((day) => (
                  <div key={day.toISOString()} className="flex min-w-0 flex-col gap-1 border-l border-divider p-1">
                    {allDay
                      .filter((e) => toDate(e.start) <= day && addDays(toDate(e.end), -1) >= day)
                      .map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setSelected(e)}
                          className="truncate rounded-[4px] bg-coral-soft px-1.5 py-0.5 text-left text-[12px] font-medium text-coral-deep"
                        >
                          {e.title}
                        </button>
                      ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Hours */}
          <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]" style={{ height: DAY_PX }}>
            <div className="relative">
              {Array.from({ length: 24 }, (_, h) => (
                <span
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-[11px] text-faint"
                  style={{ top: h * HOUR_PX }}
                >
                  {h === 0 ? "" : format(new Date(2000, 0, 1, h), "h a")}
                </span>
              ))}
            </div>
            {days.map((day) => (
              <div key={day.toISOString()} className="relative border-l border-divider">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="border-b border-divider" style={{ height: HOUR_PX }} />
                ))}
                {layoutDay(list, day).map((p) => (
                  <button
                    key={p.event.id}
                    type="button"
                    onClick={() => setSelected(p.event)}
                    className={cn(
                      "absolute overflow-hidden rounded-[5px] border-l-[3px] border-coral bg-coral-soft px-1.5 py-0.5 text-left text-[12px] leading-tight text-coral-deep transition-[filter] hover:brightness-95",
                      selected?.id === p.event.id && "ring-2 ring-coral"
                    )}
                    style={{
                      top: p.top,
                      height: p.height,
                      left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / p.lanes}% - 4px)`,
                    }}
                  >
                    <span className="block truncate font-semibold">{p.event.title}</span>
                    {p.height > 30 && (
                      <span className="block truncate">{format(toDate(p.event.start), "h:mm a")}</span>
                    )}
                  </button>
                ))}
                {isToday(day) && (
                  <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
                    <div className="h-[2px] bg-coral" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event card */}
      {selected && (
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          className="fixed inset-x-4 bottom-4 z-30 flex flex-col gap-3 rounded-card border border-line bg-surface p-5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[360px]"
        >
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-base font-semibold">{selected.title}</span>
              <span className="text-[13px] text-dim">{timeRange(selected)}</span>
            </div>
            <IconButton aria-label="Close event" onClick={() => setSelected(null)}>
              <X className="size-4" />
            </IconButton>
          </div>
          {selected.location && (
            <span className="flex items-start gap-2 text-[13px] text-ink-3">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {selected.location}
            </span>
          )}
          {selected.attendees.length > 0 && (
            <span className="flex items-start gap-2 text-[13px] text-ink-3">
              <Users className="mt-0.5 size-3.5 shrink-0" />
              <span className="flex min-w-0 flex-col">
                {selected.attendees.slice(0, 6).map((a) => (
                  <span key={a.email} className="truncate">
                    {a.name ?? a.email}
                  </span>
                ))}
                {selected.attendees.length > 6 && (
                  <span className="text-dim">+{selected.attendees.length - 6} more</span>
                )}
              </span>
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            {selected.meetLink && (
              <ButtonAnchor
                size="sm"
                href={selected.meetLink}
                target="_blank"
                rel="noreferrer"
                icon={<Video className="size-3.5" />}
              >
                Join video call
              </ButtonAnchor>
            )}
            {selected.link && (
              <ButtonAnchor
                size="sm"
                variant="ghost"
                href={selected.link}
                target="_blank"
                rel="noreferrer"
                icon={<ExternalLink className="size-3.5" />}
              >
                Open in Google Calendar
              </ButtonAnchor>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>,
    document.body
  );
}
