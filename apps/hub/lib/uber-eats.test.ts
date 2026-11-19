import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  eventIds,
  isOrderEvent,
  mapOrder,
  mapStore,
  mapStoreStatus,
  moneyToCents,
  nextMidnightIn,
  orderState,
  orderType,
  pauseUntil,
  signUberState,
  storeAddress,
  uberEnv,
  uberHosts,
  uberTimestamp,
  verifyUberSignature,
  verifyUberState,
  type UberOrderV2,
} from "@workspace/trpc/lib/uber-eats-shared";

const SECRET = "test-secret";

describe("uberHosts", () => {
  it("defaults to the sandbox and only 'production' flips to live hosts", () => {
    expect(uberHosts(undefined)).toEqual({
      auth: "https://sandbox-login.uber.com",
      api: "https://test-api.uber.com",
    });
    expect(uberHosts("sandbox")).toEqual(uberHosts(undefined));
    expect(uberHosts("production")).toEqual({
      auth: "https://auth.uber.com",
      api: "https://api.uber.com",
    });
    expect(uberEnv("prod")).toBe("sandbox");
    expect(uberEnv("production")).toBe("production");
  });
});

describe("signed connect state", () => {
  const data = { projectId: "11111111-1111-4111-8111-111111111111", userId: "u_1" };

  it("round-trips and carries a 30-minute expiry", () => {
    const now = 1_700_000_000_000;
    const token = signUberState(data, SECRET, now);
    expect(verifyUberState(token, SECRET, now)).toEqual({ ...data, exp: now / 1000 + 30 * 60 });
  });

  it("rejects a tampered body, a wrong secret, an expired token and junk", () => {
    const now = 1_700_000_000_000;
    const token = signUberState(data, SECRET, now);
    const [body, sig] = token.split(".");
    const other = Buffer.from(JSON.stringify({ ...data, userId: "u_2", exp: now / 1000 + 100 })).toString("base64url");
    expect(verifyUberState(`${other}.${sig}`, SECRET, now)).toBeNull();
    expect(verifyUberState(token, "nope", now)).toBeNull();
    expect(verifyUberState(token, SECRET, now + 31 * 60_000)).toBeNull();
    expect(verifyUberState(`${body}`, SECRET, now)).toBeNull();
    expect(verifyUberState("", SECRET, now)).toBeNull();
    expect(verifyUberState(token, "", now)).toBeNull();
  });

  it("does not verify a Wix-signed state (different prefix)", () => {
    const body = Buffer.from(JSON.stringify({ ...data, exp: 4_000_000_000 })).toString("base64url");
    const wixSig = createHmac("sha256", SECRET).update(`wix:${body}`).digest("base64url");
    expect(verifyUberState(`${body}.${wixSig}`, SECRET)).toBeNull();
  });
});

describe("verifyUberSignature", () => {
  const body = JSON.stringify({ event_type: "orders.notification", meta: { user_id: "s1" } });
  const good = createHmac("sha256", SECRET).update(body).digest("hex");

  it("accepts the lowercase hex HMAC of the raw body (and tolerates uppercase)", () => {
    expect(verifyUberSignature(body, good, SECRET)).toBe(true);
    expect(verifyUberSignature(body, good.toUpperCase(), SECRET)).toBe(true);
    expect(verifyUberSignature(body, ` ${good} `, SECRET)).toBe(true);
  });

  it("rejects a missing, wrong, truncated or non-hex signature and an empty secret", () => {
    expect(verifyUberSignature(body, null, SECRET)).toBe(false);
    expect(verifyUberSignature(body, good.slice(0, -2), SECRET)).toBe(false);
    expect(verifyUberSignature(body, good.replace(/^./, good[0] === "a" ? "b" : "a"), SECRET)).toBe(false);
    expect(verifyUberSignature(body, "zz" + good.slice(2), SECRET)).toBe(false);
    expect(verifyUberSignature(body + " ", good, SECRET)).toBe(false);
    expect(verifyUberSignature(body, good, "")).toBe(false);
  });
});

describe("webhook events", () => {
  it("reads the store and order ids from meta", () => {
    expect(
      eventIds({ event_type: "orders.notification", meta: { user_id: " store-1 ", resource_id: "order-1" } })
    ).toEqual({ storeId: "store-1", orderId: "order-1" });
    expect(eventIds({ event_type: "store.provisioned", meta: { user_id: "store-1" } })).toEqual({
      storeId: "store-1",
      orderId: null,
    });
    expect(eventIds({ event_type: "orders.notification" })).toEqual({ storeId: null, orderId: null });
  });

  it("knows which events are about orders", () => {
    expect(isOrderEvent("orders.notification")).toBe(true);
    expect(isOrderEvent("orders.status_changed")).toBe(true);
    expect(isOrderEvent("orders.release")).toBe(true);
    expect(isOrderEvent("store.menu_refresh_request")).toBe(false);
  });
});

describe("mapStore / mapStoreStatus", () => {
  it("builds one address line and keeps Uber's listing status", () => {
    const store = mapStore({
      store_id: "s1",
      name: "  Taco Place ",
      location: { address: "1 Main St", address_2: "Suite 2", city: "Tampa", state: "FL", postal_code: "33602" },
      status: "active",
      timezone: "America/New_York",
      web_url: "https://ubereats.com/store/x",
    });
    expect(store).toEqual({
      storeId: "s1",
      name: "Taco Place",
      address: "1 Main St, Suite 2, Tampa, FL 33602",
      city: "Tampa",
      state: "FL",
      postalCode: "33602",
      timezone: "America/New_York",
      webUrl: "https://ubereats.com/store/x",
      listingStatus: "active",
    });
    expect(storeAddress(undefined)).toBeNull();
    expect(storeAddress({ city: "Tampa" })).toBe("Tampa");
    expect(mapStore({ store_id: "s2" }).name).toBe("Uber Eats store");
  });

  it("reads ONLINE / PAUSED and never invents a status", () => {
    expect(mapStoreStatus({ status: "ONLINE", offline_reason: "x" })).toEqual({
      onlineStatus: "ONLINE",
      pausedUntil: null,
      offlineReason: null,
    });
    expect(mapStoreStatus({ status: "paused", paused_until: "2026-11-18T20:00:00Z", offline_reason: "Busy" })).toEqual({
      onlineStatus: "PAUSED",
      pausedUntil: new Date("2026-11-18T20:00:00Z"),
      offlineReason: "Busy",
    });
    expect(mapStoreStatus({ status: "OFFLINE" }).onlineStatus).toBe("PAUSED");
    expect(mapStoreStatus({ status: "PAUSED", paused_until: "garbage" }).pausedUntil).toBeNull();
    expect(mapStoreStatus({})).toEqual({ onlineStatus: null, pausedUntil: null, offlineReason: null });
  });
});

describe("mapOrder", () => {
  const order: UberOrderV2 = {
    id: "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d",
    display_id: "3C4D",
    current_state: "ACCEPTED",
    type: "DELIVERY_BY_UBER",
    placed_at: "2026-11-18T18:05:00Z",
    estimated_ready_for_pickup_at: "2026-11-18T18:25:00Z",
    store: { id: "s1" },
    eater: { first_name: " Sam " },
    cart: {
      items: [
        { title: "Burrito", quantity: 2 },
        { title: "", quantity: 0 },
      ],
    },
    payment: {
      charges: {
        sub_total: { amount: 2400, currency_code: "USD", formatted_amount: "$24.00" },
        tax: { amount: 168, currency_code: "USD" },
        total: { amount: 2568, currency_code: "USD", formatted_amount: "$25.68" },
      },
    },
  };

  it("keeps the first name, items and totals and nothing else", () => {
    const mapped = mapOrder(order);
    expect(mapped).toEqual({
      id: order.id,
      storeId: "s1",
      displayId: "3C4D",
      state: "ACCEPTED",
      type: "DELIVERY_BY_UBER",
      placedAt: new Date("2026-11-18T18:05:00Z"),
      readyAt: new Date("2026-11-18T18:25:00Z"),
      eaterFirstName: "Sam",
      items: [
        { title: "Burrito", quantity: 2 },
        { title: "Item", quantity: 1 },
      ],
      itemCount: 3,
      subtotalCents: 2400,
      taxCents: 168,
      totalCents: 2568,
      currency: "USD",
    });
    expect(Object.keys(mapped)).not.toContain("phone");
  });

  it("falls back for missing fields: display id from the uuid, UNKNOWN state/type, no eater", () => {
    const mapped = mapOrder({ id: "abcdef12-0000-0000-0000-00000000wxyz" });
    expect(mapped.displayId).toBe("0WXYZ");
    expect(mapped.state).toBe("UNKNOWN");
    expect(mapped.type).toBe("UNKNOWN");
    expect(mapped.eaterFirstName).toBeNull();
    expect(mapped.items).toEqual([]);
    expect(mapped.itemCount).toBe(0);
    expect(mapped.totalCents).toBeNull();
    expect(mapped.currency).toBeNull();
    expect(mapped.placedAt).toBeInstanceOf(Date);
  });

  it("normalizes states and types case-insensitively", () => {
    expect(orderState("finished")).toBe("FINISHED");
    expect(orderState("CANCELED")).toBe("CANCELED");
    expect(orderState("weird")).toBe("UNKNOWN");
    expect(orderType("pick_up")).toBe("PICK_UP");
    expect(orderType(undefined)).toBe("UNKNOWN");
  });
});

describe("moneyToCents", () => {
  it("treats integer amounts as minor units and fractional amounts as major units", () => {
    expect(moneyToCents({ amount: 2568 })).toBe(2568);
    expect(moneyToCents({ amount: 25.68 })).toBe(2568);
    expect(moneyToCents({ amount: 0 })).toBe(0);
    expect(moneyToCents({})).toBeNull();
    expect(moneyToCents(undefined)).toBeNull();
    expect(moneyToCents({ amount: Number.NaN })).toBeNull();
  });
});

describe("pause durations", () => {
  const now = new Date("2026-11-18T18:00:00Z");

  it("adds fixed durations and returns null for an open-ended pause", () => {
    expect(pauseUntil("30m", null, now)).toEqual(new Date("2026-11-18T18:30:00Z"));
    expect(pauseUntil("1h", null, now)).toEqual(new Date("2026-11-18T19:00:00Z"));
    expect(pauseUntil("2h", null, now)).toEqual(new Date("2026-11-18T20:00:00Z"));
    expect(pauseUntil("indefinite", null, now)).toBeNull();
  });

  it("'today' ends at the store's local midnight", () => {
    // 18:00Z = 13:00 in New York (EST): next midnight is 05:00Z.
    expect(pauseUntil("today", "America/New_York", now)).toEqual(new Date("2026-11-19T05:00:00Z"));
    expect(nextMidnightIn("UTC", now)).toEqual(new Date("2026-11-19T00:00:00Z"));
    // 18:00Z = 03:00 next day in Tokyo: next midnight is 15:00Z.
    expect(nextMidnightIn("Asia/Tokyo", now)).toEqual(new Date("2026-11-19T15:00:00Z"));
    expect(nextMidnightIn("Not/AZone", now)).toEqual(new Date("2026-11-19T00:00:00Z"));
  });

  it("formats timestamps the way Uber's status endpoint wants", () => {
    expect(uberTimestamp(new Date("2026-11-18T18:30:00.123Z"))).toBe("2026-11-18T18:30:00Z");
  });
});
