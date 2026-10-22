import { describe, expect, it } from "vitest";

import {
  buildUpdate,
  CONVERSION_PRESETS,
  findPreset,
  planPreset,
  trackingStatus,
  type EditableFields,
} from "@workspace/trpc/lib/agency/conversion-presets";

const preset = findPreset("lead-gen")!;

describe("lead gen preset", () => {
  it("has the four actions the Hub wires", () => {
    expect(preset.actions.map((a) => a.key)).toEqual(["lead", "calls", "qualified", "won"]);
  });

  it("only uses types that work without a website tag", () => {
    for (const action of preset.actions) {
      expect(["UPLOAD_CLICKS", "AD_CALL"]).toContain(action.type);
    }
  });

  it("has unique names so re-applying can match them", () => {
    const names = CONVERSION_PRESETS.flatMap((p) => p.actions.map((a) => a.name.toLowerCase()));
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("planPreset", () => {
  it("creates everything in an empty account", () => {
    const plan = planPreset(preset, []);
    expect(plan.create).toHaveLength(4);
    expect(plan.reuse).toHaveLength(0);
  });

  it("reuses actions with the same name, case-insensitively", () => {
    const plan = planPreset(preset, [
      { name: "website lead", resourceName: "customers/1/conversionActions/9", status: "ENABLED" },
    ]);
    expect(plan.reuse).toEqual([{ key: "lead", resourceName: "customers/1/conversionActions/9" }]);
    expect(plan.create.map((a) => a.key)).toEqual(["calls", "qualified", "won"]);
  });

  it("re-creates an action whose namesake was removed", () => {
    const plan = planPreset(preset, [
      { name: "Closed deal", resourceName: "customers/1/conversionActions/5", status: "REMOVED" },
    ]);
    expect(plan.create.map((a) => a.key)).toContain("won");
  });

  it("creates nothing when the whole preset exists (repeat apply)", () => {
    const existing = preset.actions.map((a, i) => ({
      name: a.name,
      resourceName: `customers/1/conversionActions/${i}`,
      status: "ENABLED",
    }));
    expect(planPreset(preset, existing).create).toHaveLength(0);
  });
});

describe("buildUpdate", () => {
  const before: EditableFields = {
    name: "Website lead",
    category: "SUBMIT_LEAD_FORM",
    countingType: "ONE_PER_CLICK",
    clickThroughLookbackWindowDays: 90,
    primaryForGoal: true,
    defaultValue: 0,
  };

  it("returns null when nothing changed", () => {
    expect(buildUpdate(before, { ...before })).toBeNull();
  });

  it("masks only the changed fields", () => {
    expect(buildUpdate(before, { ...before, name: "Form lead", primaryForGoal: false })).toEqual({
      body: { name: "Form lead", primaryForGoal: false },
      updateMask: "name,primary_for_goal",
    });
  });

  it("nests the default value under value_settings", () => {
    expect(buildUpdate(before, { defaultValue: 50 })).toEqual({
      body: { valueSettings: { defaultValue: 50 } },
      updateMask: "value_settings.default_value",
    });
  });
});

describe("trackingStatus", () => {
  it("is recording with conversions in the last 7 days", () => {
    expect(trackingStatus({ status: "ENABLED", last7Days: 2, everConverted: true })).toBe("recording");
  });

  it("is no recent when it converted before but not this week", () => {
    expect(trackingStatus({ status: "ENABLED", last7Days: 0, everConverted: true })).toBe("no_recent");
  });

  it("is awaiting when it never converted", () => {
    expect(trackingStatus({ status: "ENABLED", last7Days: 0, everConverted: false })).toBe("awaiting");
  });

  it("is inactive when not enabled", () => {
    expect(trackingStatus({ status: "HIDDEN", last7Days: 5, everConverted: true })).toBe("inactive");
  });
});

describe("planPreset with reserved names", () => {
  it("names the new action 'Closed deal 2' when a removed one holds the name", () => {
    const plan = planPreset(preset, [
      { name: "Closed deal", resourceName: "customers/1/conversionActions/5", status: "REMOVED" },
    ]);
    expect(plan.create.find((a) => a.key === "won")?.name).toBe("Closed deal 2");
  });

  it("skips every taken suffix", () => {
    const plan = planPreset(preset, [
      { name: "Closed deal", resourceName: "customers/1/conversionActions/5", status: "REMOVED" },
      { name: "Closed deal 2", resourceName: "customers/1/conversionActions/6", status: "REMOVED" },
    ]);
    expect(plan.create.find((a) => a.key === "won")?.name).toBe("Closed deal 3");
  });

  it("reuses an enabled suffixed action on re-apply", () => {
    const plan = planPreset(preset, [
      { name: "Closed deal", resourceName: "customers/1/conversionActions/5", status: "REMOVED" },
      { name: "Closed deal 2", resourceName: "customers/1/conversionActions/6", status: "ENABLED" },
    ]);
    expect(plan.reuse).toContainEqual({ key: "won", resourceName: "customers/1/conversionActions/6" });
    expect(plan.create.map((a) => a.key)).not.toContain("won");
  });

  it("does not treat a different name with the same prefix as a match", () => {
    const plan = planPreset(preset, [
      { name: "Closed deal value", resourceName: "customers/1/conversionActions/7", status: "ENABLED" },
    ]);
    expect(plan.create.map((a) => a.key)).toContain("won");
  });
});
