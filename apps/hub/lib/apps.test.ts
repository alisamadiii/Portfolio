import { describe, expect, it } from "vitest";

import { APP_IDS, planAllowsApp } from "@workspace/trpc/lib/apps";
import { entitlementFor } from "@workspace/trpc/lib/payment/plans";

import { APPS, appById, appState } from "./apps";

// DELIBERATE CHANGE (2026-11-15, plans priced per client): free projects can
// add NO app, feature-less ones (Resend, Calendar, Neon, Wix) included, and
// admins get no bypass here. The old "included on every plan" assertions and
// lockedCta ("upgrade" vs "ask") were replaced: a locked app is always
// "Upgrade", linking to the project's Billing page.
const FREE = entitlementFor("p", null);
const live = (plan: string) =>
  entitlementFor("p", {
    status: "active",
    priceId: "price_custom",
    cancelAtPeriodEnd: false,
    metaPlan: plan,
  });
const WEBSITE = live("website:paid");
const CUSTOM = live("agency:custom");

describe("appState", () => {
  it("a feature-less app (Resend) is locked on free, included on any paid plan", () => {
    const resend = appById("resend")!;
    expect(appState(resend, [], FREE)).toBe("locked");
    expect(appState(resend, [], WEBSITE)).toBe("included");
    expect(appState(resend, ["resend"], FREE)).toBe("installed");
  });

  it("a gated app stays locked without its feature", () => {
    const leads = appById("leads")!;
    expect(appState(leads, [], FREE)).toBe("locked");
    expect(appState(leads, [], WEBSITE)).toBe("locked");
    expect(appState(leads, [], CUSTOM)).toBe("included");
  });
});

describe("Google Calendar app", () => {
  it("needs a paid plan and opens /calendar", () => {
    const gcal = appById("gcal")!;
    expect(gcal.path).toBe("calendar");
    expect(appState(gcal, [], FREE)).toBe("locked");
    expect(appState(gcal, [], WEBSITE)).toBe("included");
    expect(appState(gcal, ["gcal"], FREE)).toBe("installed");
  });
});

describe("Neon app", () => {
  it("needs a paid plan, opens /neon and is a stored app id", () => {
    const neon = appById("neon")!;
    expect(neon.path).toBe("neon");
    expect(neon.feature).toBeUndefined();
    expect(appState(neon, [], FREE)).toBe("locked");
    expect(appState(neon, ["neon"], FREE)).toBe("installed");
    expect(APP_IDS).toContain("neon");
  });

  it("every APPS entry is a valid stored app id and vice versa", () => {
    expect(APPS.map((a) => a.id).sort()).toEqual([...APP_IDS].sort());
  });
});

describe("Wix app", () => {
  it("needs a paid plan and opens /wix", () => {
    const wix = appById("wix")!;
    expect(wix.path).toBe("wix");
    expect(wix.feature).toBeUndefined();
    expect(appState(wix, [], FREE)).toBe("locked");
    expect(APP_IDS).toContain("wix");
  });
});

describe("custom client plans (2026-11-15)", () => {
  it("the custom monthly plan unlocks every app", () => {
    for (const id of APP_IDS) expect(planAllowsApp(id, CUSTOM)).toBe(true);
  });

  it("free unlocks none", () => {
    for (const id of APP_IDS) expect(planAllowsApp(id, FREE)).toBe(false);
  });

  it("hub app features match the server's APP_FEATURES map", () => {
    for (const app of APPS) {
      expect(planAllowsApp(app.id, WEBSITE)).toBe(
        !app.feature || WEBSITE.features.includes(app.feature)
      );
    }
  });
});

describe("entitlementFor with a custom price", () => {
  it("reads the tier from metadata.plan when the price isn't in the catalog", () => {
    expect(CUSTOM.plan).toBe("agency:custom");
    expect(CUSTOM.product).toBe("agency");
  });

  it("ignores an unknown metadata plan", () => {
    expect(live("agency:bogus").plan).toBe("website:free");
  });

  it("a non-live custom subscription is free", () => {
    expect(
      entitlementFor("p", {
        status: "canceled",
        priceId: "price_custom",
        cancelAtPeriodEnd: false,
        metaPlan: "agency:custom",
      }).plan
    ).toBe("website:free");
  });
});
