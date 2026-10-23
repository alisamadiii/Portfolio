import "server-only";

import { and, eq, gte, isNull, lt } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import {
  agencyLead,
  type AgencyBookingSettings,
} from "@workspace/drizzle/schema";

import { getBusy } from "../integrations/calendar";
import { BOOKING_MINUTES, computeSlots, type Interval } from "./booking-slots";

// ─── Booking availability (server side) ──────────────────────────
// Shared by the public widget endpoint and the hub's reschedule picker:
// the same slots must be offered in both places.

const SLOT_MS = BOOKING_MINUTES * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Taken bookings in a window (what the unique index guards). */
export async function getBookedIntervals(
  repoId: number,
  fromMs: number,
  toMs: number
): Promise<Interval[]> {
  const rows = await db
    .select({ at: agencyLead.bookingAt, end: agencyLead.bookingEnd })
    .from(agencyLead)
    .where(
      and(
        eq(agencyLead.repoId, repoId),
        isNull(agencyLead.bookingCanceledAt),
        gte(agencyLead.bookingAt, new Date(fromMs - DAY_MS)),
        lt(agencyLead.bookingAt, new Date(toMs + DAY_MS))
      )
    );
  return rows
    .filter((row) => row.at)
    .map((row) => ({
      start: row.at!.toISOString(),
      end: (row.end ?? new Date(row.at!.getTime() + SLOT_MS)).toISOString(),
    }));
}

/**
 * Free slot starts for a window: working hours minus the owner's Google
 * Calendar busy times minus taken bookings. Throws when the calendar can't
 * be read (disconnected / missing scope).
 */
export async function getAvailability(input: {
  repoId: number;
  /** The owner whose calendar backs the booking. */
  userId: string;
  settings: AgencyBookingSettings;
  fromMs: number;
  toMs: number;
}): Promise<string[]> {
  const [busy, booked] = await Promise.all([
    getBusy(
      input.userId,
      new Date(input.fromMs - DAY_MS).toISOString(),
      new Date(input.toMs + DAY_MS).toISOString()
    ),
    getBookedIntervals(input.repoId, input.fromMs, input.toMs),
  ]);
  return computeSlots({
    settings: input.settings,
    busy,
    booked,
    now: new Date(),
    from: new Date(input.fromMs).toISOString(),
    to: new Date(input.toMs).toISOString(),
  });
}
