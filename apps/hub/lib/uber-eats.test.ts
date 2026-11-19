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

  it("local overrides replace either host and drop a trailing slash", () => {
    expect(uberHosts("sandbox", { auth: "http://localhost:4010/", api: "http://localhost:4010" })).toEqual({
      auth: "http://localhost:4010",
      api: "http://localhost:4010",
    });
    expect(uberHosts("production", { auth: "", api: null })).toEqual(uberHosts("production"));
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

  // DELIBERATE CHANGE (2026-11-18, phase 2 payout estimates): mapOrder now
  // also carries the restaurant's side of the money (promo it funded, fees
  // paid to it, tip, Uber marketplace fee, tax it remits), all null when Uber
  // omits them. The exact-shape assertion below grew by those five keys.
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
      merchantPromoCents: null,
      merchantFeeCents: null,
      tipCents: null,
      uberFeeCents: null,
      taxMerchantCents: null,
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

// ─── Phase 2: order detail, courier, payout estimate ─────────────

import {
  ACCEPT_WINDOW_MS,
  DENY_CODES,
  DENY_REASONS,
  acceptDeadline,
  courierStateLabel,
  estimatePayout,
  mapCourier,
  mapOrderDetail,
  merchantPromoCents,
  taxMerchantCents,
} from "@workspace/trpc/lib/uber-eats-shared";

const detailOrder: UberOrderV2 = {
  id: "11111111-2222-4333-8444-555555555555",
  display_id: "55555",
  current_state: "ACCEPTED",
  type: "DELIVERY_BY_UBER",
  placed_at: "2026-11-18T18:05:00Z",
  store: { id: "s1", name: "Tony's" },
  eater: { first_name: "Sam" },
  cart: {
    special_instructions: "Ring the bell",
    items: [
      {
        title: "Margherita Pizza",
        quantity: 2,
        price: { unit_price: { amount: 1699, currency_code: "USD" }, total_price: { amount: 3398, currency_code: "USD" } },
        special_instructions: "Well done",
        selected_modifier_groups: [
          {
            title: "Size",
            selected_items: [
              {
                title: "Large",
                quantity: 1,
                price: { unit_price: { amount: 300, currency_code: "USD" } },
                selected_modifier_groups: [{ title: "Crust", selected_items: [{ title: "Thin", quantity: 1 }] }],
              },
            ],
          },
          { title: "Extra toppings", selected_items: [{ title: "Mushrooms", quantity: 2, price: { total_price: { amount: 300, currency_code: "USD" } } }] },
          { title: "Empty group", selected_items: [] },
        ],
      },
      { title: "Soda", quantity: 1, price: { unit_price: { amount: 299, currency_code: "USD" } } },
    ],
  },
  payment: {
    charges: {
      sub_total: { amount: 3697, currency_code: "USD" },
      sub_total_promo_applied: { amount: 3327, currency_code: "USD" },
      tax: { amount: 233, currency_code: "USD" },
      total_fee: { amount: 150, currency_code: "USD" },
      delivery_fee: { amount: 299, currency_code: "USD" },
      small_order_fee: { amount: 0, currency_code: "USD" },
      tip: { amount: 500, currency_code: "USD" },
      total: { amount: 3560, currency_code: "USD" },
      cash_amount_due: { amount: 0, currency_code: "USD" },
    },
    accounting: {
      tax_remittance: {
        tax: {
          restaurant: [{ tax_remittance: "MERCHANT", tax_amount: { amount: 200, currency_code: "USD" } }],
          uber: [{ tax_remittance: "UBER", tax_amount: { amount: 33, currency_code: "USD" } }],
        },
      },
    },
  },
  deliveries: [
    {
      id: "d0",
      first_name: "Old",
      current_state: "FAILED",
    },
    {
      id: "d1",
      first_name: "Chris",
      picture_url: "https://img.test/chris.jpg",
      vehicle: { make: "Toyota", model: "Prius", color: "Silver", license_plate: "ABC1234", is_autonomous: false },
      estimated_pickup_time: "2026-11-18T18:25:00Z",
      current_state: "EN_ROUTE_TO_PICKUP",
      phone: "+18135550000",
      phone_code: "4242",
    },
  ],
};

describe("mapOrderDetail", () => {
  const d = mapOrderDetail(detailOrder);

  it("keeps items with flattened options (nested groups get a breadcrumb) and instructions", () => {
    expect(d.lines).toHaveLength(2);
    const pizza = d.lines[0]!;
    expect(pizza).toMatchObject({ title: "Margherita Pizza", quantity: 2, unitCents: 1699, totalCents: 3398, instructions: "Well done" });
    expect(pizza.modifiers).toEqual([
      { group: "Size", items: [{ title: "Large", quantity: 1, priceCents: 300 }] },
      { group: "Size › Crust", items: [{ title: "Thin", quantity: 1, priceCents: null }] },
      { group: "Extra toppings", items: [{ title: "Mushrooms", quantity: 2, priceCents: 300 }] },
    ]);
    // Line total falls back to unit × quantity when Uber omits total_price.
    expect(d.lines[1]).toMatchObject({ title: "Soda", totalCents: 299, modifiers: [], instructions: null });
    expect(d.specialInstructions).toBe("Ring the bell");
  });

  it("maps the customer-side charges in cents and the promo the restaurant funded", () => {
    expect(d.charges).toEqual({
      subtotalCents: 3697,
      promoCents: 370,
      taxCents: 233,
      serviceFeeCents: 150,
      deliveryFeeCents: 299,
      smallOrderFeeCents: 0,
      bagFeeCents: null,
      tipCents: 500,
      totalCents: 3560,
      cashDueCents: 0,
    });
    expect(d.merchantPromoCents).toBe(370);
    expect(d.merchantFeeCents).toBe(150);
    expect(d.taxMerchantCents).toBe(200);
    expect(d.uberFeeCents).toBeNull();
  });

  it("takes the latest courier, builds the vehicle line and labels the state", () => {
    expect(d.courier).toEqual({
      name: "Chris",
      photoUrl: "https://img.test/chris.jpg",
      vehicle: "Silver Toyota Prius",
      plate: "ABC1234",
      state: "EN_ROUTE_TO_PICKUP",
      stateLabel: "On the way to pick up",
      etaPickup: new Date("2026-11-18T18:25:00Z"),
      phone: "+18135550000",
      phoneCode: "4242",
    });
    expect(mapCourier([])).toBeNull();
    expect(mapCourier(undefined)).toBeNull();
    expect(mapCourier([{ first_name: " Dee " }])).toMatchObject({ name: "Dee", vehicle: null, plate: null, stateLabel: null, photoUrl: null });
  });

  it("never carries the eater's phone or last name", () => {
    const json = JSON.stringify(mapOrderDetail({ ...detailOrder, eater: { first_name: "Sam", last_name: "Ortiz", phone: "+1555" } as never }));
    expect(json).not.toContain("Ortiz");
    expect(json).not.toContain("+1555");
  });
});

describe("courierStateLabel", () => {
  it("labels known states and title-cases unknown ones", () => {
    expect(courierStateLabel("ARRIVED_AT_PICKUP")).toBe("At the restaurant");
    expect(courierStateLabel("completed")).toBe("Delivered");
    expect(courierStateLabel("WAITING_FOR_ROBOT")).toBe("Waiting for robot");
    expect(courierStateLabel(undefined)).toBeNull();
  });
});

describe("merchant-side helpers", () => {
  it("merchantPromoCents needs both subtotals and never goes negative", () => {
    expect(merchantPromoCents({ sub_total: { amount: 1000 }, sub_total_promo_applied: { amount: 900 } })).toBe(100);
    expect(merchantPromoCents({ sub_total: { amount: 1000 }, sub_total_promo_applied: { amount: 1100 } })).toBe(0);
    expect(merchantPromoCents({ sub_total: { amount: 1000 } })).toBeNull();
    expect(merchantPromoCents(undefined)).toBeNull();
  });

  // Regression (2026-11-18): a 0 "applied" subtotal next to a real subtotal
  // was read as a 100% merchant promo and wiped the payout estimate.
  it("merchantPromoCents treats a bare zero applied-subtotal as unknown, not a full discount", () => {
    expect(merchantPromoCents({ sub_total: { amount: 2498 }, sub_total_promo_applied: { amount: 0 } })).toBeNull();
    expect(merchantPromoCents({ sub_total: { amount: 0 }, sub_total_promo_applied: { amount: 0 } })).toBe(0);
  });

  it("merchantPromoCents prefers the funding splits when Uber lists promotions", () => {
    const charges = { sub_total: { amount: 1000 }, sub_total_promo_applied: { amount: 700 } };
    expect(
      merchantPromoCents(charges, {
        promotions: [
          { promo_type: "PERCENTOFF", promo_funding_splits: [{ funding_source: "organization", amount: { amount: 100 } }, { funding_source: "uber", amount: { amount: 200 } }] },
          { promo_type: "FREEDELIVERY", promo_funding_splits: [{ funding_source: "uber", amount: 299 }] },
        ],
      })
    ).toBe(100);
    // Listed promotions, none merchant-funded (Uber paid): no promo on the restaurant's side.
    expect(merchantPromoCents(charges, { promotions: [{ promo_funding_splits: [{ funding_source: "uber", amount: { amount: 300 } }] }] })).toBe(0);
    expect(merchantPromoCents(charges, { promotions: [] })).toBe(0);
    // No promotions block at all: fall back to the subtotal difference.
    expect(merchantPromoCents(charges, undefined)).toBe(300);
  });

  it("taxMerchantCents sums only the restaurant's lines, null without a breakdown", () => {
    expect(taxMerchantCents(detailOrder)).toBe(200);
    expect(taxMerchantCents({ id: "x", payment: { accounting: { tax_remittance: { tax: { uber: [{ tax_amount: { amount: 50 } }] } } } } })).toBe(0);
    expect(taxMerchantCents({ id: "x" })).toBeNull();
  });
});

describe("estimatePayout", () => {
  const base = { subtotalCents: 3697, merchantPromoCents: 370, merchantFeeCents: 150, tipCents: 500, uberFeeCents: null, taxMerchantCents: 200 };

  it("is null without a rate or a subtotal", () => {
    expect(estimatePayout({ ...base, commissionBps: null })).toBeNull();
    expect(estimatePayout({ ...base, subtotalCents: null, commissionBps: 3000 })).toBeNull();
  });

  it("takes the commission on subtotal minus the funded promo, then adds merchant tax, fees and tip", () => {
    // base 3327 × 30% = 998.1 → 998; payout = 3327 − 998 + 200 + 150 + 500 = 3179
    expect(estimatePayout({ ...base, commissionBps: 3000 })).toEqual({ commissionCents: 998, payoutCents: 3179 });
  });

  it("subtracts Uber's marketplace fee on own-delivery orders and treats missing parts as zero", () => {
    expect(estimatePayout({ subtotalCents: 2000, merchantPromoCents: null, merchantFeeCents: null, tipCents: null, uberFeeCents: 100, taxMerchantCents: null, commissionBps: 1500 })).toEqual({
      commissionCents: 300,
      payoutCents: 1600,
    });
    expect(estimatePayout({ ...base, commissionBps: 0 })).toEqual({ commissionCents: 0, payoutCents: 4177 });
  });
});

describe("webhook event names, phase 2", () => {
  it("treats Uber's singular order.* events as order events and store events as not", () => {
    expect(isOrderEvent("order.fulfillment_issues.resolved")).toBe(true);
    expect(isOrderEvent("orders.cancel")).toBe(true);
    expect(isOrderEvent("store.status.changed")).toBe(false);
    expect(isOrderEvent("ordersx.notification")).toBe(false);
  });
});

describe("acceptDeadline", () => {
  it("is 11.5 minutes after placing, never negative", () => {
    const placed = new Date("2026-11-18T18:00:00Z");
    expect(acceptDeadline(placed, new Date("2026-11-18T18:01:30Z"))).toEqual({
      deadline: new Date("2026-11-18T18:11:30Z"),
      remainingMs: 10 * 60_000,
    });
    expect(acceptDeadline(placed, new Date("2026-11-18T19:00:00Z")).remainingMs).toBe(0);
    expect(ACCEPT_WINDOW_MS).toBe(690_000);
  });

  it("deny reasons are Uber's codes, each with a label", () => {
    expect(DENY_CODES).toContain("ITEM_AVAILABILITY");
    expect(DENY_CODES).toContain("OTHER");
    for (const r of DENY_REASONS) expect(r.label.length).toBeGreaterThan(3);
  });
});
