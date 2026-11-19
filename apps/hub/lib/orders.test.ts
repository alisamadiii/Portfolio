import { describe, expect, it } from "vitest";

import { DELIVERY_APP_IDS, DELIVERY_PROVIDERS, fromUberOrder, hasDeliveryApp, installedDeliveryApps } from "@/components/orders/providers";

const order = {
  id: "o1",
  displayId: "ABC12",
  state: "CREATED" as const,
  type: "DELIVERY_BY_UBER" as const,
  placedAt: "2026-11-19T18:00:00.000Z",
  readyAt: null,
  eaterFirstName: null,
  items: [
    { title: "Burger", quantity: 2 },
    { title: "Fries", quantity: 1 },
  ],
  itemCount: 3,
  subtotalCents: 1800,
  tipCents: 200,
  totalCents: 2450,
  currency: "USD",
};

describe("delivery providers (2026-11-19)", () => {
  it("Orders shows up for any installed delivery app", () => {
    expect(hasDeliveryApp(["leads", "analytics"])).toBe(false);
    expect(hasDeliveryApp(["doordash"])).toBe(true);
    expect(installedDeliveryApps(["doordash", "uber-eats", "wix"])).toEqual(["uber-eats", "doordash"]);
    for (const id of DELIVERY_APP_IDS) expect(DELIVERY_PROVIDERS[id].name.length).toBeGreaterThan(0);
  });

  it("only Uber Eats feeds orders today", () => {
    expect(DELIVERY_PROVIDERS["uber-eats"].hasOrders).toBe(true);
    expect(DELIVERY_PROVIDERS.doordash.hasOrders).toBe(false);
  });
});

describe("fromUberOrder (2026-11-19)", () => {
  it("maps a new delivery order", () => {
    const row = fromUberOrder(order, "America/New_York");
    expect(row).toMatchObject({
      provider: "uber-eats",
      displayId: "ABC12",
      customer: "Customer",
      itemsSummary: "2× Burger, 1× Fries",
      status: "open",
      stateLabel: "New",
      tone: "coral",
      typeLabel: "Uber delivery",
      awaitingAccept: true,
      timezone: "America/New_York",
    });
  });

  it("buckets finished and denied orders", () => {
    expect(fromUberOrder({ ...order, state: "FINISHED", eaterFirstName: "Ana" }, null)).toMatchObject({
      status: "completed",
      customer: "Ana",
      awaitingAccept: false,
    });
    expect(fromUberOrder({ ...order, state: "DENIED" }, null).status).toBe("canceled");
    expect(fromUberOrder({ ...order, state: "CANCELED" }, null).status).toBe("canceled");
    expect(fromUberOrder({ ...order, items: [] }, null).itemsSummary).toBe("—");
  });
});

// ─── Grubhub joins the Orders page (2026-11-19) ───────────────────

import { fromGrubhubOrder, orderKey, orderProviders, parseOrderKey, sortRows } from "@/components/orders/providers";

const grubhubOrder = {
  id: "JylzkoC0Ee2zk-PUFdlLqg",
  orderNumber: "604721063804098",
  status: "RESTAURANT_CONFIRMABLE" as const,
  fulfillment: "PICKUP" as const,
  scheduling: "ASAP" as const,
  isTest: false,
  placedAt: "2026-11-19T18:05:00.000Z",
  whenFor: null,
  dinerName: "John",
  items: [{ title: "Margherita", quantity: 1 }],
  itemCount: 1,
  merchantTotalCents: 1920,
  grandTotalCents: 2020,
  tipCents: 300,
  waitTimeMinutes: null,
  cancelRequestStatus: null,
};

describe("Grubhub as a delivery provider (2026-11-19)", () => {
  it("is a delivery app that stores orders", () => {
    expect(DELIVERY_APP_IDS).toContain("grubhub");
    expect(DELIVERY_PROVIDERS.grubhub.hasOrders).toBe(true);
    expect(hasDeliveryApp(["grubhub"])).toBe(true);
    expect(orderProviders(["doordash", "grubhub", "uber-eats"])).toEqual(["uber-eats", "grubhub"]);
    expect(orderProviders(["doordash"])).toEqual([]);
  });

  it("maps a new pickup order with Grubhub's merchant total as the row total", () => {
    expect(fromGrubhubOrder(grubhubOrder, "America/New_York")).toMatchObject({
      provider: "grubhub",
      displayId: "604721063804098",
      customer: "John",
      itemsSummary: "1× Margherita",
      totalCents: 1920,
      currency: "USD",
      status: "open",
      stateLabel: "New",
      tone: "coral",
      typeLabel: "Pickup",
      awaitingAccept: true,
      timezone: "America/New_York",
    });
  });

  it("buckets completed, rejected, stale and test orders", () => {
    expect(fromGrubhubOrder({ ...grubhubOrder, status: "FULFILLED", dinerName: null }, null)).toMatchObject({
      status: "completed",
      customer: "Customer",
      awaitingAccept: false,
    });
    expect(fromGrubhubOrder({ ...grubhubOrder, status: "REJECTED" }, null).status).toBe("canceled");
    expect(fromGrubhubOrder({ ...grubhubOrder, status: "STALE" }, null)).toMatchObject({ status: "canceled", stateLabel: "Missed" });
    expect(fromGrubhubOrder({ ...grubhubOrder, status: "CONFIRMED", fulfillment: "SELF_DELIVERY" }, null)).toMatchObject({
      status: "open",
      awaitingAccept: false,
      typeLabel: "Own delivery",
    });
    expect(fromGrubhubOrder({ ...grubhubOrder, isTest: true }, null).stateLabel).toBe("New (test)");
  });

  it("one ?order= key for every provider, old bare Uber ids still open", () => {
    expect(orderKey("grubhub", "abc")).toBe("grubhub:abc");
    expect(parseOrderKey("grubhub:abc")).toEqual({ provider: "grubhub", id: "abc" });
    expect(parseOrderKey("uber-eats:x:y")).toEqual({ provider: "uber-eats", id: "x:y" });
    expect(parseOrderKey("legacy-uber-id")).toEqual({ provider: "uber-eats", id: "legacy-uber-id" });
    expect(parseOrderKey(null)).toBeNull();
  });

  it("merges providers newest first", () => {
    const a = fromGrubhubOrder(grubhubOrder, null);
    const b = fromUberOrder(order, null);
    expect(sortRows([b, a]).map((r) => r.provider)).toEqual(["grubhub", "uber-eats"]);
  });
});
