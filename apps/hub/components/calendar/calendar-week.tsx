"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
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
import {
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Users,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { handleCmsError } from "@/lib/trpc-errors";

import { Button, ButtonAnchor, IconButton } from "@/components/ds/ui/button";

import { darken, EVENT_COLORS, useEventColors } from "./event-colors";
import { NewEventDialog, writableCalendars } from "./new-event-dialog";

type Calendar = RouterOutputs["gcal"]["calendars"][number];
type CalEvent = RouterOutputs["gcal"]["events"][number] & {
  calendarId: string;
  /** The title's saved color, else the calendar's. */
  color: string | null;
  /** Color picked in this browser for this title (tints the text too). */
  custom: boolean;
};

const HOUR_PX = 48;
const DAY_PX = 24 * HOUR_PX;

// All-day events carry a bare date ("2026-11-13"): parse it as local midnight.
const toDate = (value: string) =>
  value.length === 10 ? parseISO(`${value}T00:00:00`) : parseISO(value);

const isHex = (color: string | null): color is string =>
  !!color && /^#[0-9a-f]{6}$/i.test(color);

/** Tinted fill + solid edge in the event's color; a picked color tints the text too. */
const eventStyle = (e: Pick<CalEvent, "color" | "custom">) =>
  isHex(e.color)
    ? {
        backgroundColor: `${e.color}2e`,
        borderColor: e.color,
        ...(e.custom ? { color: darken(e.color) } : {}),
      }
    : undefined;

/** The selected event's outline, in its calendar's color. */
const selectedRing = (color: string | null) =>
  isHex(color) ? { boxShadow: `0 0 0 2px ${color}` } : undefined;

/**
 * Right-click an event: pick its color. Saved in this browser per exact
 * title, so every event named the same takes the color.
 */
function EventColorMenu({
  event,
  onPick,
  children,
}: {
  event: CalEvent;
  onPick: (hex: string | null) => void;
  children: ReactElement;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />
      <ContextMenuContent className="w-64">
        {/* Base UI: a group label must sit inside a group. */}
        <ContextMenuGroup>
          <ContextMenuLabel className="truncate">
            Color for &ldquo;{event.title}&rdquo;
          </ContextMenuLabel>
          <div className="grid grid-cols-8 gap-1.5 px-2 pt-1 pb-2">
            {EVENT_COLORS.map((c) => (
              <ContextMenuItem
                key={c.hex}
                aria-label={c.name}
                title={c.name}
                onClick={() => onPick(c.hex)}
                className="flex size-6 items-center justify-center rounded-full p-0"
                style={{ backgroundColor: c.hex }}
              >
                {event.custom && event.color === c.hex && (
                  <span className="size-2 rounded-full bg-white" />
                )}
              </ContextMenuItem>
            ))}
          </div>
          <label className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm">
            <input
              type="color"
              aria-label="Custom color"
              value={event.custom && event.color ? event.color : "#fc8464"}
              onChange={(e) => onPick(e.target.value)}
              className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
            />
            Custom color…
          </label>
        </ContextMenuGroup>
        {event.custom && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onPick(null)}>
              Use calendar color
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

type Placed = {
  event: CalEvent;
  top: number;
  height: number;
  lane: number;
  lanes: number;
};

/** Timed events of one day, positioned, overlapping ones side by side. */
function layoutDay(events: CalEvent[], day: Date): Placed[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const items = events
    .filter((e) => !e.allDay)
    .map((event) => ({
      event,
      start: maxDate([toDate(event.start), dayStart]),
      end: minDate([toDate(event.end), dayEnd]),
    }))
    .filter((e) => e.end > e.start)
    .sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() ||
        b.end.getTime() - a.end.getTime()
    );

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
    for (const p of cluster)
      laneEnds[p.lane] = Math.max(laneEnds[p.lane] ?? 0, p.endMs);
    let lane = laneEnds.findIndex((end) => end <= item.start.getTime());
    if (lane === -1) lane = laneEnds.length;
    cluster.push({
      event: item.event,
      top: (differenceInMinutes(item.start, dayStart) / 60) * HOUR_PX,
      height: Math.max(
        18,
        (differenceInMinutes(item.end, item.start) / 60) * HOUR_PX - 2
      ),
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

/**
 * The Calendar page body: a week view filling the content area, events of
 * every picked calendar in that calendar's color. Read-only.
 */
export function CalendarWeek({
  projectId,
  calendars,
  shown,
  onShownChange,
  actions,
  canCreate = false,
}: {
  projectId: string;
  calendars: Calendar[];
  /** Ids of the calendars to show. */
  shown: string[];
  onShownChange: (ids: string[]) => void;
  /** Right end of the toolbar (account + Disconnect). */
  actions?: React.ReactNode;
  /** Full access: "New event" + click an empty slot to add one. */
  canCreate?: boolean;
}) {
  const trpc = useTRPC();
  const { colors, setColor } = useEventColors();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState<CalEvent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The new-event dialog: start time + a key that remounts it per open.
  const [draft, setDraft] = useState<{ start: Date; key: number } | null>(null);
  const creatable = canCreate && writableCalendars(calendars).length > 0;
  const openDraft = (start: Date) => setDraft({ start, key: Date.now() });
  const nextHour = () => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  };
  const isSelected = (e: CalEvent) =>
    selected?.id === e.id && selected.calendarId === e.calendarId;

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const visible = calendars.filter((c) => shown.includes(c.id));
  const from = weekStart.toISOString();
  const to = addDays(weekStart, 7).toISOString();

  const results = useQueries({
    queries: visible.map((c) =>
      trpc.gcal.events.queryOptions(
        { projectId, calendarId: c.id, from, to },
        { placeholderData: keepPreviousData, retry: false }
      )
    ),
  });
  const events: CalEvent[] = results.flatMap((r, i) =>
    (r.data ?? []).map((e) => ({
      ...e,
      calendarId: visible[i]!.id,
      color: colors[e.title] ?? visible[i]!.color,
      custom: !!colors[e.title],
    }))
  );
  const fetching = results.some((r) => r.isFetching);
  const failed = results.find((r) => r.isError);
  const allDay = events.filter((e) => e.allDay);

  // Esc closes the event card.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="border-line bg-surface flex flex-wrap items-center gap-2 border-b px-4 py-2.5 sm:px-6">
        <Button size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          Today
        </Button>
        <IconButton
          aria-label="Previous week"
          onClick={() => setWeekStart((w) => addWeeks(w, -1))}
        >
          <ChevronLeft className="size-4" />
        </IconButton>
        <IconButton
          aria-label="Next week"
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
        >
          <ChevronRight className="size-4" />
        </IconButton>
        <h1 className="mr-2 text-base font-semibold tracking-[-0.01em]">
          {range}
        </h1>
        {fetching && <span className="text-dim text-[13px]">Loading…</span>}
        <div className="ml-auto flex items-center gap-2">
          {creatable && (
            <Button
              size="sm"
              variant="primary"
              icon={<CalendarPlus className="size-3.5" />}
              onClick={() => openDraft(nextHour())}
            >
              New event
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="sm"
                  trailingIcon={<ChevronDown className="size-3.5" />}
                >
                  Calendars
                  <span className="text-faint">
                    {visible.length}/{calendars.length}
                  </span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-60">
              {calendars.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={shown.includes(c.id)}
                  onCheckedChange={(on) =>
                    onShownChange(
                      on ? [...shown, c.id] : shown.filter((id) => id !== c.id)
                    )
                  }
                >
                  <span
                    className="bg-faint size-2.5 shrink-0 rounded-full"
                    style={c.color ? { backgroundColor: c.color } : undefined}
                  />
                  <span className="truncate">{c.name}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {actions}
        </div>
      </div>

      {failed?.error && (
        <p className="border-line bg-danger-soft text-danger border-b px-6 py-2 text-[13px]">
          {handleCmsError(failed.error, "Couldn't load some events.")}
        </p>
      )}

      {/* Week grid: scrolls inside the page, sideways on small screens. */}
      <div ref={scrollRef} className="bg-surface min-h-0 flex-1 overflow-auto">
        <div className="min-w-[760px]">
          {/* Day headers + all-day strip */}
          <div className="border-line bg-surface sticky top-0 z-20 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b">
            <div />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="border-divider flex flex-col items-center gap-0.5 border-l py-2"
              >
                <span className="text-dim text-[12px]">
                  {format(day, "EEE")}
                </span>
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
                <div className="text-faint flex items-start justify-end pt-1 pr-2 text-[11px]">
                  All day
                </div>
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="border-divider flex min-w-0 flex-col gap-1 border-l p-1"
                  >
                    {allDay
                      .filter(
                        (e) =>
                          toDate(e.start) <= day &&
                          addDays(toDate(e.end), -1) >= day
                      )
                      .map((e) => (
                        <EventColorMenu
                          key={`${e.calendarId}:${e.id}`}
                          event={e}
                          onPick={(hex) => setColor(e.title, hex)}
                        >
                          <button
                            type="button"
                            onClick={() => setSelected(e)}
                            className={cn(
                              "border-coral bg-coral-soft text-ink truncate rounded-[4px] border-l-[3px] px-1.5 py-0.5 text-left text-[12px] font-medium outline-none",
                              isSelected(e) && "ring-coral ring-2"
                            )}
                            style={{
                              ...eventStyle(e),
                              ...(isSelected(e) ? selectedRing(e.color) : {}),
                            }}
                          >
                            {e.title}
                          </button>
                        </EventColorMenu>
                      ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Hours */}
          <div
            className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]"
            style={{ height: DAY_PX }}
          >
            <div className="relative">
              {Array.from({ length: 24 }, (_, h) => (
                <span
                  key={h}
                  className="text-faint absolute right-2 -translate-y-1/2 text-[11px]"
                  style={{ top: h * HOUR_PX }}
                >
                  {h === 0 ? "" : format(new Date(2000, 0, 1, h), "h a")}
                </span>
              ))}
            </div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-divider relative border-l",
                  creatable && "cursor-cell"
                )}
                onClick={(e) => {
                  if (!creatable) return;
                  // React bubbles clicks from portals (the event color menu)
                  // through here: only real clicks on the column count.
                  if (!e.currentTarget.contains(e.target as Node)) return;
                  // Empty space: start at the clicked half hour.
                  const y =
                    e.clientY - e.currentTarget.getBoundingClientRect().top;
                  const minutes = Math.min(
                    23 * 60 + 30,
                    Math.max(0, Math.floor((y / HOUR_PX) * 2) * 30)
                  );
                  const start = startOfDay(day);
                  start.setMinutes(minutes);
                  openDraft(start);
                }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="border-divider border-b"
                    style={{ height: HOUR_PX }}
                  />
                ))}
                {layoutDay(events, day).map((p) => (
                  <EventColorMenu
                    key={`${p.event.calendarId}:${p.event.id}`}
                    event={p.event}
                    onPick={(hex) => setColor(p.event.title, hex)}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(p.event);
                      }}
                      className={cn(
                        "border-coral bg-coral-soft text-ink absolute flex flex-col items-start justify-start overflow-hidden rounded-[5px] border-l-[3px] px-2 pt-1.5 pb-1 text-left text-[12px] leading-tight transition-[filter] outline-none hover:brightness-95",
                        isSelected(p.event) && "ring-coral ring-2"
                      )}
                      style={{
                        ...eventStyle(p.event),
                        ...(isSelected(p.event)
                          ? selectedRing(p.event.color)
                          : {}),
                        top: p.top,
                        height: p.height,
                        left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
                        width: `calc(${100 / p.lanes}% - 4px)`,
                      }}
                    >
                      <span className="block w-full truncate font-semibold">
                        {p.event.title}
                      </span>
                      {p.height > 30 && (
                        <span className="block w-full truncate opacity-75">
                          {format(toDate(p.event.start), "h:mm a")}
                        </span>
                      )}
                    </button>
                  </EventColorMenu>
                ))}
                {isToday(day) && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10"
                    style={{ top: nowTop }}
                  >
                    <div className="bg-coral h-[2px]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {draft && (
        <NewEventDialog
          key={draft.key}
          projectId={projectId}
          calendars={calendars}
          defaultCalendarId={calendars.find((c) => c.primary)?.id}
          start={draft.start}
          open
          onOpenChange={(open) => !open && setDraft(null)}
        />
      )}

      {/* Event card */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={`${selected.calendarId}:${selected.id}`}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="rounded-card border-line bg-surface absolute inset-x-4 bottom-4 z-30 flex flex-col gap-3 border p-5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[360px]"
          >
            <div className="flex items-start gap-3">
              <span
                className="bg-coral mt-1.5 size-2.5 shrink-0 rounded-full"
                style={
                  selected.color
                    ? { backgroundColor: selected.color }
                    : undefined
                }
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-base font-semibold">
                  {selected.title}
                </span>
                <span className="text-dim text-[13px]">
                  {timeRange(selected)}
                </span>
              </div>
              <IconButton
                aria-label="Close event"
                onClick={() => setSelected(null)}
              >
                <X className="size-4" />
              </IconButton>
            </div>
            {selected.location && (
              <span className="text-ink-3 flex items-start gap-2 text-[13px]">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                {selected.location}
              </span>
            )}
            {selected.attendees.length > 0 && (
              <span className="text-ink-3 flex items-start gap-2 text-[13px]">
                <Users className="mt-0.5 size-3.5 shrink-0" />
                <span className="flex min-w-0 flex-col">
                  {selected.attendees.slice(0, 6).map((a) => (
                    <span key={a.email} className="truncate">
                      {a.name ?? a.email}
                    </span>
                  ))}
                  {selected.attendees.length > 6 && (
                    <span className="text-dim">
                      +{selected.attendees.length - 6} more
                    </span>
                  )}
                </span>
              </span>
            )}
            {(selected.meetLink || selected.link) && (
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
