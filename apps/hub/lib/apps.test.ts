import { describe, expect, it } from "vitest";

import { APP_IDS, planAllowsApp } from "@workspace/trpc/lib/apps";
import { entitlementFor } from "@workspace/trpc/lib/payment/plans";

import { ACCOUNT_PRODUCTS, accountNav, APPS, appById, appState, projectCoreNav } from "./apps";

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

  // DELIBERATE CHANGE (2026-11-15, later the same day): the Website plan now
  // includes every feature (any monthly subscription unlocks every app), so
  // Leads is included on it; the "WEBSITE stays locked" assertion was flipped.
  it("a gated app stays locked on free, included on any monthly plan", () => {
    const leads = appById("leads")!;
    expect(appState(leads, [], FREE)).toBe("locked");
    expect(appState(leads, [], WEBSITE)).toBe("included");
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

describe("Google Reviews app", () => {
  it("needs a paid plan, no feature, and opens /google-reviews", () => {
    const app = appById("google-reviews")!;
    expect(app.path).toBe("google-reviews");
    expect(app.feature).toBeUndefined();
    expect(appState(app, [], FREE)).toBe("locked");
    expect(appState(app, [], WEBSITE)).toBe("included");
    expect(APP_IDS).toContain("google-reviews");
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

// Regression (2026-11-15): a client plan that includes the catalog Website
// Management price resolved to "Website plan" and left Leads/Ads/Newsletter
// locked. metadata.plan now wins over the catalog price.
describe("client plan containing a catalog price", () => {
  it("metadata.plan wins over the catalog price", async () => {
    const { pricesFor } = await import("@workspace/trpc/lib/payment/plans");
    const websitePrice = pricesFor("website:paid")!.recurring;
    const entitlement = entitlementFor("p", {
      status: "active",
      priceId: websitePrice,
      cancelAtPeriodEnd: false,
      metaPlan: "agency:custom",
    });
    expect(entitlement.plan).toBe("agency:custom");
    for (const id of APP_IDS) expect(planAllowsApp(id, entitlement)).toBe(true);
  });

  it("a catalog subscription without metadata.plan still uses its price", async () => {
    const { pricesFor } = await import("@workspace/trpc/lib/payment/plans");
    expect(
      entitlementFor("p", {
        status: "active",
        priceId: pricesFor("website:paid")!.recurring,
        cancelAtPeriodEnd: false,
        metaPlan: null,
      }).plan
    ).toBe("website:paid");
  });
});

// Regression (2026-11-15): legacy Website plan subscribers saw Leads, Google
// Ads and Newsletter locked although they pay monthly.
describe("legacy Website plan", () => {
  it("unlocks every app", async () => {
    const { pricesFor } = await import("@workspace/trpc/lib/payment/plans");
    const entitlement = entitlementFor("p", {
      status: "active",
      priceId: pricesFor("website:paid")!.recurring,
      cancelAtPeriodEnd: false,
      metaPlan: null,
    });
    for (const id of APP_IDS) expect(planAllowsApp(id, entitlement)).toBe(true);
  });
});

describe("Uber Eats app", () => {
  it("needs a paid plan, no feature, and opens /uber-eats", () => {
    const app = appById("uber-eats")!;
    expect(app.path).toBe("uber-eats");
    expect(app.feature).toBeUndefined();
    expect(app.logo).toBeDefined();
    expect(appState(app, [], FREE)).toBe("locked");
    expect(appState(app, [], WEBSITE)).toBe("included");
    expect(appState(app, ["uber-eats"], WEBSITE)).toBe("installed");
    expect(APP_IDS).toContain("uber-eats");
  });
});

describe("DoorDash app", () => {
  it("needs a paid plan, no feature, and opens /doordash", () => {
    const app = appById("doordash")!;
    expect(app.path).toBe("doordash");
    expect(app.feature).toBeUndefined();
    expect(app.logo).toBeDefined();
    expect(appState(app, [], FREE)).toBe("locked");
    expect(appState(app, [], WEBSITE)).toBe("included");
    expect(appState(app, ["doordash"], WEBSITE)).toBe("installed");
    expect(APP_IDS).toContain("doordash");
  });
});

describe("Grubhub app (2026-11-19)", () => {
  it("needs a paid plan, no feature, and opens /grubhub", () => {
    const app = appById("grubhub")!;
    expect(app.path).toBe("grubhub");
    expect(app.feature).toBeUndefined();
    expect(app.logo).toBeDefined();
    expect(appState(app, [], FREE)).toBe("locked");
    expect(appState(app, [], WEBSITE)).toBe("included");
    expect(appState(app, ["grubhub"], WEBSITE)).toBe("installed");
    expect(APP_IDS).toContain("grubhub");
  });
});

describe("workspace sidebar account group (2026-11-19)", () => {
  it("lists Sites at /sites, never at /, and keeps account billing under /account", () => {
    const nav = accountNav({ isAdmin: false });
    expect(nav[0]).toMatchObject({ id: "sites", path: "/sites" });
    expect(nav.some((i) => i.path === "/")).toBe(false);
    expect(nav.find((i) => i.id === "billing")?.path).toBe("/account/billing");
    expect(nav.some((i) => i.adminOnly)).toBe(false);
  });

  it("adds the locked admin pages for admins only", () => {
    const admin = accountNav({ isAdmin: true });
    expect(admin.filter((i) => i.adminOnly).map((i) => i.path)).toEqual(["/client-websites", "/inspirations"]);
  });

  it("points Purchases at the account billing tab", () => {
    expect(ACCOUNT_PRODUCTS.find((i) => i.id === "purchases")?.path).toBe("/account/billing?tab=purchases");
  });
});

describe("Orders in the core nav (2026-11-19)", () => {
  it("sits right after Netlify when a delivery app is installed, else absent", () => {
    const ids = (nav: { id: string }[]) => nav.map((i) => i.id);
    expect(ids(projectCoreNav({ netlify: true, members: true, orders: true })).slice(-3)).toEqual(["members", "netlify", "orders"]);
    expect(ids(projectCoreNav({ netlify: false, members: false, orders: true })).at(-1)).toBe("orders");
    expect(ids(projectCoreNav({ netlify: true, members: true }))).not.toContain("orders");
    expect(projectCoreNav({ netlify: false, members: false, orders: true }).at(-1)?.path).toBe("orders");
  });
});

describe("Coming soon badge (2026-11-19)", () => {
  it("flags DoorDash and Grubhub while their partner approvals are pending", () => {
    expect(appById("doordash")!.comingSoon).toBe(true);
    expect(appById("grubhub")!.comingSoon).toBe(true);
  });

  it("leaves every other app without the flag", () => {
    for (const app of APPS) {
      if (app.id === "doordash" || app.id === "grubhub") continue;
      expect(app.comingSoon, app.id).toBeUndefined();
    }
  });
});
