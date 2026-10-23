import { describe, expect, it } from "vitest";

import type { AgencyBookingSettings } from "@workspace/drizzle/schema";
import {
  BOOKING_MINUTES,
  bookingSettingsSchema,
  computeSlots,
  isTimezone,
  isValidSlot,
  overlaps,
  zonedTimeToUtc,
} from "@workspace/trpc/lib/agency/booking-slots";

const TYPE = { id: "intro", name: "Intro call" };

// Weekdays only, 9-17 New York. 2026-11-16 is a Monday.
const settings: AgencyBookingSettings = {
  timezone: "America/New_York",
  hours: {
    "1": [{ from: "09:00", to: "17:00" }],
    "2": [{ from: "09:00", to: "17:00" }],
    "3": [{ from: "09:00", to: "17:00" }],
    "4": [{ from: "09:00", to: "17:00" }],
    "5": [{ from: "09:00", to: "17:00" }],
  },
  noticeHours: 0,
  horizonDays: 30,
  types: [TYPE],
};

const NOW = new Date("2026-11-15T00:00:00Z"); // Sunday

const slotsFor = (
  overrides: Partial<AgencyBookingSettings>,
  input?: Partial<Parameters<typeof computeSlots>[0]>
) =>
  computeSlots({
    settings: { ...settings, ...overrides },
    busy: [],
    booked: [],
    now: NOW,
    from: "2026-11-16T00:00:00Z",
    to: "2026-11-17T00:00:00Z",
    ...input,
  });

describe("computeSlots", () => {
  it("builds a 15-minute grid inside the day's working hours", () => {
    const slots = slotsFor({});
    // 9:00-17:00 EST = 8 hours = 32 slots.
    expect(slots).toHaveLength(32);
    // 9:00 EST = 14:00 UTC in November (UTC-5).
    expect(slots[0]).toBe("2026-11-16T14:00:00.000Z");
    // Last slot starts 16:45 EST so it ends exactly at 17:00.
    expect(slots.at(-1)).toBe("2026-11-16T21:45:00.000Z");
  });

  it("returns nothing on a closed day", () => {
    const slots = slotsFor(
      {},
      { from: "2026-11-15T00:00:00Z", to: "2026-11-16T00:00:00Z" } // Sunday
    );
    expect(slots).toHaveLength(0);
  });

  it("supports multiple ranges in one day", () => {
    const slots = slotsFor({
      hours: {
        "1": [
          { from: "09:00", to: "10:00" },
          { from: "14:00", to: "15:00" },
        ],
      },
    });
    expect(slots).toHaveLength(8);
    expect(slots).toContain("2026-11-16T14:00:00.000Z"); // 9:00 EST
    expect(slots).toContain("2026-11-16T19:00:00.000Z"); // 14:00 EST
  });

  it("drops slots that overlap Google busy times", () => {
    const slots = slotsFor(
      {},
      // 9:30-10:00 EST busy.
      { busy: [{ start: "2026-11-16T14:30:00Z", end: "2026-11-16T15:00:00Z" }] }
    );
    expect(slots).not.toContain("2026-11-16T14:30:00.000Z");
    expect(slots).not.toContain("2026-11-16T14:45:00.000Z");
    expect(slots).toContain("2026-11-16T14:15:00.000Z");
    expect(slots).toContain("2026-11-16T15:00:00.000Z");
  });

  it("a busy time that only touches a slot's edge does not block it", () => {
    const slots = slotsFor(
      {},
      { busy: [{ start: "2026-11-16T14:15:00Z", end: "2026-11-16T14:30:00Z" }] }
    );
    expect(slots).toContain("2026-11-16T14:00:00.000Z");
    expect(slots).toContain("2026-11-16T14:30:00.000Z");
    expect(slots).not.toContain("2026-11-16T14:15:00.000Z");
  });

  it("keeps the buffer free after taken bookings", () => {
    const slots = slotsFor(
      { bufferMinutes: 15 },
      { booked: [{ start: "2026-11-16T14:00:00Z", end: "2026-11-16T14:15:00Z" }] }
    );
    // The booking blocks 14:00 and the buffer blocks 14:15.
    expect(slots).not.toContain("2026-11-16T14:00:00.000Z");
    expect(slots).not.toContain("2026-11-16T14:15:00.000Z");
    expect(slots).toContain("2026-11-16T14:30:00.000Z");
  });

  it("notice hours hide the nearest slots", () => {
    const slots = computeSlots({
      settings: { ...settings, noticeHours: 4 },
      busy: [],
      booked: [],
      // Monday 14:00 UTC = first slot's start.
      now: new Date("2026-11-16T14:00:00Z"),
      from: "2026-11-16T00:00:00Z",
      to: "2026-11-17T00:00:00Z",
    });
    // Everything before 18:00 UTC (13:00 EST) is gone.
    expect(slots[0]).toBe("2026-11-16T18:00:00.000Z");
  });

  it("the horizon caps how far ahead slots exist", () => {
    const slots = slotsFor(
      { horizonDays: 1 },
      { from: "2026-11-17T00:00:00Z", to: "2026-11-18T00:00:00Z" }
    );
    // Horizon ends Monday 00:00 UTC + 1 day = Nov 16 24:00; Tuesday is out.
    expect(slots).toHaveLength(0);
  });

  it("DST transition day keeps wall-clock hours (Nov 1 2026, America/New_York)", () => {
    // Sunday Nov 1 2026: clocks fall back, the day is 25 hours long.
    const slots = computeSlots({
      settings: {
        ...settings,
        hours: { "0": [{ from: "09:00", to: "11:00" }] },
      },
      busy: [],
      booked: [],
      now: new Date("2026-10-31T00:00:00Z"),
      from: "2026-11-01T00:00:00Z",
      to: "2026-11-02T00:00:00Z",
    });
    // Still exactly 2 wall-clock hours = 8 slots, 9:00 EST = 14:00 UTC.
    expect(slots).toHaveLength(8);
    expect(slots[0]).toBe("2026-11-01T14:00:00.000Z");
  });
});

describe("zonedTimeToUtc", () => {
  it("converts New York wall time in winter (UTC-5)", () => {
    expect(zonedTimeToUtc(2026, 11, 16, 9, 0, "America/New_York")).toBe(
      Date.parse("2026-11-16T14:00:00Z")
    );
  });

  it("converts New York wall time in summer (UTC-4)", () => {
    expect(zonedTimeToUtc(2026, 7, 1, 9, 0, "America/New_York")).toBe(
      Date.parse("2026-07-01T13:00:00Z")
    );
  });

  it("handles quarter-hour offsets (Asia/Kathmandu, UTC+5:45)", () => {
    expect(zonedTimeToUtc(2026, 11, 16, 9, 0, "Asia/Kathmandu")).toBe(
      Date.parse("2026-11-16T03:15:00Z")
    );
  });
});

describe("overlaps", () => {
  it("touching intervals do not overlap", () => {
    expect(overlaps(0, 10, 10, 20)).toBe(false);
    expect(overlaps(10, 20, 0, 10)).toBe(false);
  });

  it("any shared time overlaps", () => {
    expect(overlaps(0, 10, 9, 20)).toBe(true);
    expect(overlaps(5, 6, 0, 10)).toBe(true);
  });
});

describe("isValidSlot", () => {
  it("accepts a slot the grid produces", () => {
    expect(isValidSlot("2026-11-16T14:00:00.000Z", settings, NOW)).toBe(true);
  });

  it("rejects off-grid and out-of-hours times", () => {
    expect(isValidSlot("2026-11-16T14:05:00.000Z", settings, NOW)).toBe(false);
    expect(isValidSlot("2026-11-16T03:00:00.000Z", settings, NOW)).toBe(false);
    expect(isValidSlot("not a date", settings, NOW)).toBe(false);
  });
});

describe("bookingSettingsSchema", () => {
  it("accepts a sane configuration", () => {
    expect(bookingSettingsSchema.safeParse(settings).success).toBe(true);
  });

  it("rejects times off the quarter-hour grid", () => {
    expect(
      bookingSettingsSchema.safeParse({
        ...settings,
        hours: { "1": [{ from: "09:10", to: "17:00" }] },
      }).success
    ).toBe(false);
  });

  it("rejects a range that ends before it starts", () => {
    expect(
      bookingSettingsSchema.safeParse({
        ...settings,
        hours: { "1": [{ from: "17:00", to: "09:00" }] },
      }).success
    ).toBe(false);
  });

  it("rejects an unknown timezone", () => {
    expect(
      bookingSettingsSchema.safeParse({ ...settings, timezone: "Mars/Olympus" })
        .success
    ).toBe(false);
  });
});

describe("isTimezone", () => {
  it("accepts IANA names and rejects junk", () => {
    expect(isTimezone("Europe/Berlin")).toBe(true);
    expect(isTimezone("nope")).toBe(false);
  });
});

describe("BOOKING_MINUTES", () => {
  it("every meeting is fixed at 15 minutes", () => {
    expect(BOOKING_MINUTES).toBe(15);
  });
});
