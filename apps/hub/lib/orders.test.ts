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
