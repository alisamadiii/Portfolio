import { describe, expect, it } from "vitest";

import { APP_IDS } from "@workspace/trpc/lib/apps";

import { APPS, appById, appState, lockedCta } from "./apps";

describe("appState", () => {
  it("a feature-less app (Resend) is included on every plan, never locked", () => {
    const resend = appById("resend")!;
    expect(appState(resend, [], () => false)).toBe("included");
    expect(appState(resend, ["resend"], () => false)).toBe("installed");
    expect(lockedCta(resend)).toBe("ask");
  });

  it("a gated app stays locked without its feature", () => {
    const leads = appById("leads")!;
    expect(appState(leads, [], () => false)).toBe("locked");
    expect(appState(leads, [], () => true)).toBe("included");
  });
});

describe("Google Calendar app", () => {
  it("is included on every plan and opens /calendar", () => {
    const gcal = appById("gcal")!;
    expect(gcal.path).toBe("calendar");
    expect(appState(gcal, [], () => false)).toBe("included");
    expect(appState(gcal, ["gcal"], () => false)).toBe("installed");
  });
});

describe("Neon app", () => {
  it("is included on every plan, opens /neon and is a stored app id", () => {
    const neon = appById("neon")!;
    expect(neon.path).toBe("neon");
    expect(neon.feature).toBeUndefined();
    expect(appState(neon, [], () => false)).toBe("included");
    expect(appState(neon, ["neon"], () => false)).toBe("installed");
    expect(APP_IDS).toContain("neon");
  });

  it("every APPS entry is a valid stored app id and vice versa", () => {
    expect(APPS.map((a) => a.id).sort()).toEqual([...APP_IDS].sort());
  });
});

describe("Wix app", () => {
  it("is included on every plan and opens /wix", () => {
    const wix = appById("wix")!;
    expect(wix.path).toBe("wix");
    expect(wix.feature).toBeUndefined();
    expect(appState(wix, [], () => false)).toBe("included");
    expect(APP_IDS).toContain("wix");
  });
});
