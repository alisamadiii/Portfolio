import { describe, expect, it } from "vitest";

import { resolveHubView } from "@/lib/hub-view";

describe("resolveHubView", () => {
  it("non-agency users always get the website view", () => {
    expect(resolveHubView(false, undefined)).toBe("website");
    expect(resolveHubView(false, "agency")).toBe("website");
    expect(resolveHubView(false, "website")).toBe("website");
  });

  it("agency users default to the agency view with no cookie", () => {
    expect(resolveHubView(true, undefined)).toBe("agency");
  });

  it("agency users keep their website choice", () => {
    expect(resolveHubView(true, "website")).toBe("website");
  });

  it("agency users with the agency cookie or junk get agency", () => {
    expect(resolveHubView(true, "agency")).toBe("agency");
    expect(resolveHubView(true, "nonsense")).toBe("agency");
  });
});
