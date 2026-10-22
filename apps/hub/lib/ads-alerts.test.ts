import { describe, expect, it } from "vitest";

import { evaluateAlerts, type AlertSignals } from "@workspace/trpc/lib/agency/ads-alerts";
import { budgetPacing } from "@workspace/trpc/lib/agency/budget-pacing";

const midJune = new Date("2026-06-15T12:00:00Z");

const quiet: AlertSignals = {
  pacing: null,
  targetCents: null,
  conversionsLast7: 10,
  conversionsPrior7: 10,
  disapprovedAds: 0,
  budgetLimited: [],
  trackingBroken: [],
  uploadFailures: 0,
};

describe("evaluateAlerts", () => {
  it("stays quiet when everything is healthy", () => {
    expect(evaluateAlerts(quiet)).toEqual([]);
  });

  it("flags overspending as critical", () => {
    const alerts = evaluateAlerts({
      ...quiet,
      targetCents: 100_000,
      pacing: budgetPacing(90_000, 100_000, midJune),
    });
    expect(alerts.map((a) => a.id)).toContain("overspend");
    expect(alerts.find((a) => a.id === "overspend")!.severity).toBe("critical");
  });

  it("only warns about underspending from day 10", () => {
    const early = budgetPacing(500, 100_000, new Date("2026-06-05T00:00:00Z"));
    expect(evaluateAlerts({ ...quiet, targetCents: 100_000, pacing: early })).toEqual([]);

    const late = budgetPacing(5_000, 100_000, midJune);
    expect(
      evaluateAlerts({ ...quiet, targetCents: 100_000, pacing: late }).map((a) => a.id)
    ).toContain("underspend");
  });

  it("flags a conversions drop of more than half week over week", () => {
    const alerts = evaluateAlerts({ ...quiet, conversionsLast7: 2, conversionsPrior7: 10 });
    expect(alerts.map((a) => a.id)).toContain("conversions-drop");
  });

  it("ignores drops on small accounts below the prior-week floor", () => {
    expect(evaluateAlerts({ ...quiet, conversionsLast7: 1, conversionsPrior7: 4 })).toEqual([]);
  });

  it("ignores a drop that stays above half of the prior week", () => {
    expect(evaluateAlerts({ ...quiet, conversionsLast7: 6, conversionsPrior7: 10 })).toEqual([]);
  });

  it("flags disapproved ads", () => {
    const alerts = evaluateAlerts({ ...quiet, disapprovedAds: 2 });
    expect(alerts[0]!.id).toBe("disapproved-ads");
    expect(alerts[0]!.title).toBe("2 disapproved ads");
  });

  it("only flags budget-limited campaigns above the 20% share", () => {
    expect(
      evaluateAlerts({ ...quiet, budgetLimited: [{ name: "Brand", share: 0.1 }] })
    ).toEqual([]);
    const alerts = evaluateAlerts({
      ...quiet,
      budgetLimited: [{ name: "Brand", share: 0.4 }],
    });
    expect(alerts.map((a) => a.id)).toContain("budget-limited");
  });

  it("raises one alert per broken tracking action", () => {
    const alerts = evaluateAlerts({
      ...quiet,
      trackingBroken: [
        { name: "Website lead", status: "no_recent" },
        { name: "Closed deal", status: "inactive" },
      ],
    });
    expect(alerts).toHaveLength(2);
  });

  it("flags failing uploads", () => {
    const alerts = evaluateAlerts({ ...quiet, uploadFailures: 1 });
    expect(alerts[0]!.title).toBe("1 conversion upload failing");
  });

  it("sorts critical alerts before warnings", () => {
    const alerts = evaluateAlerts({
      ...quiet,
      uploadFailures: 3,
      disapprovedAds: 1,
    });
    expect(alerts.map((a) => a.severity)).toEqual(["critical", "warning"]);
  });
});
