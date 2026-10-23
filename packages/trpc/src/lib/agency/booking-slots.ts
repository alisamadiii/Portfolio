// ─── Booking slots ───────────────────────────────────────────────
// Pure availability math for the booking widget. Every meeting is a fixed
// 15 minutes, so free time is a grid of equal slots: working hours in the
// owner's timezone, minus Google Calendar busy times, minus taken bookings.
// Timezone conversion uses Intl only (no date library), which handles DST.

import { z } from "zod";

import type { AgencyBookingSettings } from "@workspace/drizzle/schema";

export const BOOKING_MINUTES = 15;
export const DEFAULT_NOTICE_HOURS = 4;
export const DEFAULT_HORIZON_DAYS = 30;
/** The widget may ask for at most this many days per request. */
export const MAX_RANGE_DAYS = 31;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const SLOT = BOOKING_MINUTES * MINUTE;

export type Interval = { start: string; end: string };

// Quarter hours only, so every slot lands on the global 15-minute grid
// (timezone offsets are all multiples of 15 minutes too).
const TIME_RE = /^([01]\d|2[0-3]):(00|15|30|45)$/;

const timeRange = z
  .object({ from: z.string().regex(TIME_RE), to: z.string().regex(TIME_RE) })
  .refine((range) => range.from < range.to, { message: "Range must end after it starts" });

export const bookingSettingsSchema = z.object({
  timezone: z.string().refine(isTimezone, { message: "Unknown timezone" }),
  hours: z.partialRecord(
    z.enum(["0", "1", "2", "3", "4", "5", "6"]),
    z.array(timeRange).max(4)
  ),
  noticeHours: z.number().int().min(0).max(14 * 24).optional(),
  horizonDays: z.number().int().min(1).max(90).optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  types: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        name: z.string().min(1).max(80),
        description: z.string().max(300).optional(),
        meet: z.boolean().optional(),
        active: z.boolean().optional(),
      })
    )
    .max(10),
});

export function isTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// ─── Timezone math (Intl only) ───────────────────────────────────

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let dtf = formatters.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatters.set(timeZone, dtf);
  }
  return dtf;
}

/** The wall-clock parts an instant shows in a timezone. */
function wallParts(utcMs: number, timeZone: string) {
  const parts: Record<string, number> = {};
  for (const part of formatter(timeZone).formatToParts(new Date(utcMs))) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  // "24" appears for midnight in some ICU versions.
  if (parts.hour === 24) parts.hour = 0;
  return parts as { year: number; month: number; day: number; hour: number; minute: number };
}

function offsetMs(utcMs: number, timeZone: string) {
  const wall = wallParts(utcMs, timeZone);
  return (
    Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute) - utcMs
  );
}

/**
 * The UTC instant at which a timezone's clocks read the given wall time.
 * Around DST jumps a nonexistent wall time resolves to the shifted instant,
 * which is fine for slot grids: the slot simply lands where the clock does.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = offsetMs(guess - offsetMs(guess, timeZone), timeZone);
  return guess - offset;
}

/** Calendar date (and weekday) an instant falls on in a timezone. */
export function zonedDate(utcMs: number, timeZone: string) {
  const wall = wallParts(utcMs, timeZone);
  return {
    year: wall.year,
    month: wall.month,
    day: wall.day,
    weekday: new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay(),
  };
}

// ─── Availability ────────────────────────────────────────────────

/** Half-open interval overlap: touching ends don't conflict. */
export const overlaps = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
) => aStart < bEnd && aEnd > bStart;

const toMs = (iso: string) => new Date(iso).getTime();

export function computeSlots(input: {
  settings: AgencyBookingSettings;
  /** Google Calendar busy times. */
  busy: Interval[];
  /** Taken bookings (not canceled). */
  booked: Interval[];
  now: Date;
  /** Requested window, UTC ISO. */
  from: string;
  to: string;
}): string[] {
  const { settings, now } = input;
  const nowMs = now.getTime();
  const earliest =
    nowMs + (settings.noticeHours ?? DEFAULT_NOTICE_HOURS) * 60 * MINUTE;
  const latest = nowMs + (settings.horizonDays ?? DEFAULT_HORIZON_DAYS) * DAY;
  const windowFrom = Math.max(toMs(input.from), earliest);
  const windowTo = Math.min(toMs(input.to), latest);
  if (!(windowFrom < windowTo)) return [];

  const buffer = (settings.bufferMinutes ?? 0) * MINUTE;
  const blocks = [
    ...input.busy.map((b) => ({ start: toMs(b.start), end: toMs(b.end) })),
    // The buffer keeps a gap after each booking.
    ...input.booked.map((b) => ({ start: toMs(b.start), end: toMs(b.end) + buffer })),
  ].filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end));

  const slots: string[] = [];
  // Walk owner-timezone calendar days; a day beyond each edge covers the
  // offset between the requested UTC window and the owner's clock.
  for (
    let cursor = windowFrom - DAY;
    cursor <= windowTo + DAY;
    cursor += DAY
  ) {
    const date = zonedDate(cursor, settings.timezone);
    const ranges = settings.hours[String(date.weekday)];
    if (!ranges?.length) continue;

    for (const range of ranges) {
      const [fromH, fromM] = range.from.split(":").map(Number);
      const [toH, toM] = range.to.split(":").map(Number);
      const rangeStart = zonedTimeToUtc(
        date.year, date.month, date.day, fromH!, fromM!, settings.timezone
      );
      const rangeEnd = zonedTimeToUtc(
        date.year, date.month, date.day, toH!, toM!, settings.timezone
      );
      for (let start = rangeStart; start + SLOT <= rangeEnd; start += SLOT) {
        const end = start + SLOT;
        if (start < windowFrom || start >= windowTo) continue;
        if (blocks.some((b) => overlaps(start, end, b.start, b.end))) continue;
        slots.push(new Date(start).toISOString());
      }
    }
  }
  // Duplicate days can appear when the ±1-day walk lands on the same owner
  // date twice (DST makes days 23 or 25 hours long).
  return [...new Set(slots)].sort();
}

/** True when `at` is one of the computable slot starts for its day. */
export function isValidSlot(
  at: string,
  settings: AgencyBookingSettings,
  now: Date
) {
  const atMs = toMs(at);
  if (!Number.isFinite(atMs)) return false;
  const slots = computeSlots({
    settings,
    busy: [],
    booked: [],
    now,
    from: new Date(atMs - DAY).toISOString(),
    to: new Date(atMs + SLOT).toISOString(),
  });
  return slots.includes(new Date(atMs).toISOString());
}
