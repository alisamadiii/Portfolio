import { describe, expect, it } from "vitest";

import { budgetPacing } from "@workspace/trpc/lib/agency/budget-pacing";

// June 2026 has 30 days; the 15th is exactly halfway.
const midJune = new Date("2026-06-15T12:00:00Z");

describe("budgetPacing", () => {
  it("projects month end on a straight line from spend so far", () => {
    const pacing = budgetPacing(50_000, 100_000, midJune);
    expect(pacing.daysInMonth).toBe(30);
    expect(pacing.daysElapsed).toBe(15);
    expect(pacing.projectedCents).toBe(100_000);
  });

  it("calls an exact projection on pace", () => {
    expect(budgetPacing(50_000, 100_000, midJune).status).toBe("on_pace");
    expect(budgetPacing(50_000, 100_000, midJune).pace).toBe(1);
  });

  it("flags overspending above 115% of the target", () => {
    expect(budgetPacing(60_000, 100_000, midJune).status).toBe("overspending");
  });

  it("flags underspending below 85% of the target", () => {
    expect(budgetPacing(40_000, 100_000, midJune).status).toBe("underspending");
  });

  it("has no status without a target", () => {
    const pacing = budgetPacing(50_000, null, midJune);
    expect(pacing.pace).toBeNull();
    expect(pacing.status).toBeNull();
    expect(pacing.suggestedDailyCents).toBeNull();
  });

  it("suggests spreading what's left evenly over the remaining days", () => {
    // 100k target, 40k spent, 15 days left: 4k/day.
    expect(budgetPacing(40_000, 100_000, midJune).suggestedDailyCents).toBe(4_000);
  });

  it("never suggests a negative daily budget once over target", () => {
    expect(budgetPacing(120_000, 100_000, midJune).suggestedDailyCents).toBe(0);
  });

  it("survives day one of the month without dividing by zero", () => {
    const first = new Date("2026-06-01T08:00:00Z");
    const pacing = budgetPacing(1_000, 30_000, first);
    expect(pacing.daysElapsed).toBe(1);
    expect(pacing.projectedCents).toBe(30_000);
    expect(Number.isFinite(pacing.suggestedDailyCents!)).toBe(true);
  });

  it("gives no daily suggestion on the last day of the month", () => {
    const last = new Date("2026-06-30T08:00:00Z");
    expect(budgetPacing(90_000, 100_000, last).suggestedDailyCents).toBeNull();
  });

  it("uses the UTC month for boundaries", () => {
    // Local time could be July 1st somewhere; UTC says June 30.
    const pacing = budgetPacing(0, null, new Date("2026-06-30T23:30:00Z"));
    expect(pacing.daysInMonth).toBe(30);
    expect(pacing.daysElapsed).toBe(30);
  });

  it("handles February of a leap year", () => {
    expect(budgetPacing(0, null, new Date("2028-02-10T00:00:00Z")).daysInMonth).toBe(29);
  });
});
