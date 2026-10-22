import { describe, expect, it } from "vitest";

import {
  delta,
  reportWeek,
  weekLabel,
} from "@workspace/trpc/lib/agency/report-math";

describe("reportWeek", () => {
  it("on a Monday reports the week that just ended", () => {
    // 2026-10-19 is a Monday.
    expect(reportWeek(new Date("2026-10-19T13:00:00Z"))).toEqual({
      from: "2026-10-12",
      to: "2026-10-18",
      priorFrom: "2026-10-05",
      priorTo: "2026-10-11",
    });
  });

  it("mid-week still reports the last complete week", () => {
    // Thursday belongs to the running week, which is not reported yet.
    expect(reportWeek(new Date("2026-10-22T09:00:00Z")).to).toBe("2026-10-18");
  });

  it("on a Sunday the running week is still incomplete", () => {
    expect(reportWeek(new Date("2026-10-18T23:00:00Z"))).toMatchObject({
      from: "2026-10-05",
      to: "2026-10-11",
    });
  });

  it("crosses a year boundary", () => {
    // 2027-01-04 is the first Monday of 2027.
    expect(reportWeek(new Date("2027-01-04T13:00:00Z"))).toMatchObject({
      from: "2026-12-28",
      to: "2027-01-03",
    });
  });

  it("uses UTC weekdays, not local time", () => {
    // Late Sunday UTC is already Monday in UTC+11; UTC must win.
    const week = reportWeek(new Date("2026-10-19T00:30:00Z"));
    expect(week.to).toBe("2026-10-18");
  });
});

describe("delta", () => {
  it("reports growth as a rounded percent", () => {
    expect(delta(15, 10)).toEqual({ pct: 50, direction: "up" });
  });

  it("reports decline", () => {
    expect(delta(5, 10)).toEqual({ pct: -50, direction: "down" });
  });

  it("is flat when nothing changed", () => {
    expect(delta(10, 10)).toEqual({ pct: 0, direction: "flat" });
  });

  it("has no percent when the prior week was zero", () => {
    expect(delta(4, 0)).toEqual({ pct: null, direction: "up" });
  });

  it("stays quiet when both weeks are zero", () => {
    expect(delta(0, 0)).toEqual({ pct: null, direction: "flat" });
  });
});

describe("weekLabel", () => {
  it("formats the reported range", () => {
    expect(weekLabel(reportWeek(new Date("2026-10-19T13:00:00Z")))).toBe(
      "Oct 12 – Oct 18"
    );
  });
});
