import { describe, expect, it } from "vitest";

import { appById, appState, lockedCta } from "./apps";

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
