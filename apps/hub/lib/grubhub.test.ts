import { createHash, createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CANCEL_CODES,
  CONFIRM_WINDOW_MS,
  INTEGRATION_META,
  OPEN_ORDER_STATUSES,
  ORDER_STATUSES,
  REJECT_CODES,
  SOLD_ORDER_STATUSES,
  STATUS_META,
  orderStatusGroup,
} from "@workspace/trpc/lib/grubhub-constants";
import {
  allowedActions,
  bodyHash,
  cancelRequestBody,
  classifyWebhook,
  confirmDeadline,
  grubhubEnv,
  grubhubHosts,
  macNonce,
  macNormalizedString,
  mapMerchant,
  mapOrder,
  mapOrderDetail,
  orderFulfillment,
  ordersWindow,
  parseInstant,
  parseMacHeader,
  signGrubhubRequest,
  splitName,
  statusUpdateBody,
  verifyBasicAuth,
  type PosOrder,
} from "@workspace/trpc/lib/grubhub-shared";

// ─── Hosts ───────────────────────────────────────────────────────

describe("grubhubHosts (2026-11-19)", () => {
  it("defaults to preprod, switches to production, honours a local override", () => {
    expect(grubhubHosts(undefined).api).toBe("https://api-third-party-gtm-pp.grubhub.com");
    expect(grubhubHosts("preprod").api).toBe("https://api-third-party-gtm-pp.grubhub.com");
    expect(grubhubHosts("production").api).toBe("https://api-third-party-gtm.grubhub.com");
    expect(grubhubHosts("production", "http://localhost:4011/").api).toBe("http://localhost:4011");
    expect(grubhubEnv("prod")).toBe("preprod");
    expect(grubhubEnv("production")).toBe("production");
  });
});

// ─── MAC signing ─────────────────────────────────────────────────

const CREDS = { clientId: "sv:v1:00aa7970-9e83-11ed-a7e9-000000000000", secret: "shh-secret" };

describe("MAC request signing (2026-11-19)", () => {
  it("hashes the body with sha256, base64", () => {
    expect(bodyHash("")).toBe("47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=");
    expect(bodyHash('{"a":1}')).toBe(createHash("sha256").update('{"a":1}').digest("base64"));
  });

  it("builds the seven-line normalized string, method upper, host lower, trailing newline", () => {
    const s = macNormalizedString({
      nonce: "TEST-POST",
      method: "post",
      requestUri: "/pos/v1/merchant/123/orders?status=CONFIRMED",
      host: "API-Third-Party-GTM-PP.grubhub.com",
      port: 443,
      bodyhash: "X",
    });
    expect(s).toBe("TEST-POST\nPOST\n/pos/v1/merchant/123/orders?status=CONFIRMED\napi-third-party-gtm-pp.grubhub.com\n443\nX\n\n");
    expect(s.split("\n")).toHaveLength(8);
  });

  it("signs a POST with bodyhash and a mac over the normalized string", () => {
    const body = '{"new_pos_status":"OFFLINE"}';
    const url = new URL("https://api-third-party-gtm-pp.grubhub.com/pos/v1/merchant/123/pos-status");
    const signed = signGrubhubRequest(CREDS, { method: "PUT", url, body, nonce: "12:abcdefgh" });
    expect(signed.authorization).toMatch(
      /^MAC id="sv:v1:[^"]+",nonce="12:abcdefgh",bodyhash="[A-Za-z0-9+/=]+",mac="[A-Za-z0-9+/=]+"$/
    );
    expect(signed.bodyhash).toBe(bodyHash(body));
    expect(signed.normalized).toBe(`12:abcdefgh\nPUT\n/pos/v1/merchant/123/pos-status\napi-third-party-gtm-pp.grubhub.com\n443\n${bodyHash(body)}\n\n`);
    expect(signed.mac).toBe(createHmac("sha256", CREDS.secret).update(signed.normalized).digest("base64"));
    expect(parseMacHeader(signed.authorization)).toEqual({
      id: CREDS.clientId,
      nonce: "12:abcdefgh",
      bodyhash: signed.bodyhash,
      ext: null,
      mac: signed.mac,
    });
    // TODO once the docs' Python vector is reproduced byte for byte (json.dumps spacing):
    // expect(mac).toBe("wRVb8jpFEkH8F7FWkI0v8tdLb86BALO3U4AdVS+rXeU=")
  });

  it("leaves bodyhash out of a GET and keeps the query string in the URI", () => {
    const url = new URL("https://api-third-party-gtm-pp.grubhub.com/pos/v1/merchant/123/orders?status=CONFIRMED&status=PICKUP_READY");
    const signed = signGrubhubRequest(CREDS, { method: "GET", url, nonce: "5:zzzzzzzz" });
    expect(signed.bodyhash).toBeNull();
    expect(signed.authorization).not.toContain("bodyhash=");
    expect(signed.normalized).toBe("5:zzzzzzzz\nGET\n/pos/v1/merchant/123/orders?status=CONFIRMED&status=PICKUP_READY\napi-third-party-gtm-pp.grubhub.com\n443\n\n\n");
  });

  it("uses the URL's port for a local stand-in", () => {
    const url = new URL("http://localhost:4011/pos/v1/merchant/1");
    expect(signGrubhubRequest(CREDS, { method: "GET", url, nonce: "n" }).normalized).toContain("\nlocalhost\n4011\n");
  });

  it("nonce = seconds since the issue date, colon, 8 letters", () => {
    const issued = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T00:01:30Z");
    expect(macNonce(issued, now, "AbCd1234")).toBe("90:AbCd1234");
    expect(macNonce(issued, now)).toMatch(/^90:[A-Za-z0-9]{8}$/);
    expect(macNonce(now, issued, "x")).toBe("0:x");
  });

  it("parseMacHeader rejects anything that isn't a MAC header", () => {
    expect(parseMacHeader(null)).toBeNull();
    expect(parseMacHeader("Bearer abc")).toBeNull();
    expect(parseMacHeader('MAC id="a"')).toBeNull();
  });
});

// ─── Webhook auth ────────────────────────────────────────────────

const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}`;

describe("verifyBasicAuth (2026-11-19)", () => {
  it("accepts the configured user and password only", () => {
    expect(verifyBasicAuth(basic("hub", "s3cret"), "hub", "s3cret")).toBe(true);
    expect(verifyBasicAuth(basic("hub", "wrong"), "hub", "s3cret")).toBe(false);
    expect(verifyBasicAuth(basic("other", "s3cret"), "hub", "s3cret")).toBe(false);
    expect(verifyBasicAuth(null, "hub", "s3cret")).toBe(false);
    expect(verifyBasicAuth("Bearer abc", "hub", "s3cret")).toBe(false);
    expect(verifyBasicAuth(basic("hub", "s3cret"), "", "")).toBe(false);
  });

  it("splits at the first colon so passwords may contain colons", () => {
    expect(verifyBasicAuth(basic("hub", "a:b:c"), "hub", "a:b:c")).toBe(true);
  });
});

// ─── Fixtures ────────────────────────────────────────────────────

const pickupOrder: PosOrder = {
  uuid: "JylzkoC0Ee2zk-PUFdlLqg",
  order_number: "604721063804098",
  status: "RESTAURANT_CONFIRMABLE",
  merchant_id: "10004116752",
  order_merchant_id: "9CvhTfZvNvqR8_WRGSjL9Q",
  is_test: false,
  time_placed: "2026-11-19T22:18:06.214Z",
  when_for: "2026-11-19T22:38:06.221Z",
  fulfillment_scheduling: "ASAP",
  order_type: "STANDARD",
  restaurant_timezone_id: "America/New_York",
  external_order_id: null,
  statusHistory: [{ status: "RESTAURANT_CONFIRMABLE", timestamp: "2026-11-19T22:18:07.000Z", update_source: "TXS" }],
  fulfillment_info: {
    pickup_info: { name: "John Doe", contact_info: { phone: "(222) 222-2222", name: "John Doe" }, instructions: "Ring the bell" },
  },
  diners: [{ diner_info: { phone: "(222) 222-2222", name: "John Doe", email: "john@example.com" }, participation: "HOST" }],
  charges: {
    fees: { total: 0, delivery: 0 },
    taxes: { total: 120, merchant_total: 120 },
    tip: { amount: 300, type: "CASH" },
    diner_grand_total: 2020,
    grand_total: 2020,
    coupons: [{ text: "$2 off", amount: 200 }],
    merchant_total: 1920,
    merchant_subtotal: 1600,
    line_groups: [
      {
        label: "Group 1",
        lines: [
          {
            name: "Margherita",
            quantity: 1,
            price: 1200,
            merchant_price: 1200,
            total: 1200,
            special_instructions: "Extra crispy",
            line_options: [
              { label: "Size", name: "Large", price: 200, quantity: 1 },
              { label: "Toppings", name: "Basil", price: 0, quantity: 1 },
              { label: "Toppings", name: "Olives", price: 100, quantity: 1 },
            ],
          },
          { name: "Garlic knots", quantity: 2, price: 200, merchant_price: 200, total: 400, line_options: [] },
        ],
      },
    ],
  },
};

describe("classifyWebhook (2026-11-19)", () => {
  it("recognises an order body", () => {
    const w = classifyWebhook(pickupOrder);
    expect(w.kind).toBe("order");
    if (w.kind === "order") expect(w.order.uuid).toBe(pickupOrder.uuid);
  });

  it("recognises the activation webhook", () => {
    const w = classifyWebhook({
      activation_job_id: "job-1",
      overall_status: "PARTIAL_SUCCESS",
      activation_results: [
        { merchant_id: "123456", status: "SUCCESSFUL", reason_code: "SUCCESSFUL", reason_message: "", live_date: "2026-10-14T17:48:43.592Z" },
        { merchant_id: "654321", status: "FAILED", reason_code: "FAILED", reason_message: "Merchant integration activation failed" },
        { status: "INVALID" },
      ],
    });
    expect(w).toMatchObject({
      kind: "activation",
      jobId: "job-1",
      overallStatus: "PARTIAL_SUCCESS",
      results: [
        { merchantId: "123456", status: "SUCCESSFUL", liveDate: new Date("2026-10-14T17:48:43.592Z") },
        { merchantId: "654321", status: "FAILED", reasonMessage: "Merchant integration activation failed", liveDate: null },
      ],
    });
  });

  it("recognises the documented Merchant Availability shapes", () => {
    expect(
      classifyWebhook({
        merchant_id: "12345",
        status: "OFFLINE",
        name: "DELIVERY",
        end_time: "2025-01-11T04:30:00.000Z",
        reason: "Your Grubhub location is paused",
      })
    ).toEqual({
      kind: "availability",
      merchantId: "12345",
      status: "OFFLINE",
      fulfillment: "DELIVERY",
      endTime: new Date("2025-01-11T04:30:00.000Z"),
      reason: "Your Grubhub location is paused",
    });
    expect(classifyWebhook({ merchant_id: "12345", status: "ONLINE" })).toMatchObject({ kind: "availability", status: "ONLINE", endTime: null });
    expect(classifyWebhook({ merchant_id: 12345, status: "offline" })).toMatchObject({ kind: "availability", merchantId: "12345", status: "OFFLINE" });
  });

  it("recognises menu ingestion status and merchant configuration lists", () => {
    expect(classifyWebhook({ job_id: "j1", status: "SUCCESS" })).toEqual({ kind: "menu_ingestion", jobId: "j1", status: "SUCCESS" });
    expect(classifyWebhook({ merchant_ids: ["1", 2, { merchant_id: "3" }] })).toEqual({ kind: "merchant_config", merchantIds: ["1", "2", "3"] });
  });

  it("reports unknown shapes by their keys and never throws", () => {
    expect(classifyWebhook({ foo: 1, bar: 2 })).toEqual({ kind: "unknown", keys: ["foo", "bar"] });
    expect(classifyWebhook(null)).toEqual({ kind: "unknown", keys: [] });
    expect(classifyWebhook("x")).toEqual({ kind: "unknown", keys: [] });
    expect(classifyWebhook([1])).toEqual({ kind: "unknown", keys: [] });
  });
});

describe("mapMerchant (2026-11-19)", () => {
  it("maps Grubhub's merchant record, timezone from the address", () => {
    expect(
      mapMerchant({
        merchant_id: "abc123",
        merchant_uuid: "u-1",
        name: "Tony's Pizzeria",
        address: { street_address: "123 Main Street", street_address2: "Suite 456", locality: "Tampa", region: "FL", postal_code: "33602", time_zone: "America/New_York" },
        account_status: { merchant_status: "ACTIVE", pos_merchant_status: "ONLINE", accepting_online_orders: true },
      })
    ).toEqual({
      merchantId: "abc123",
      merchantUuid: "u-1",
      name: "Tony's Pizzeria",
      address: "123 Main Street, Suite 456, Tampa, FL 33602",
      city: "Tampa",
      state: "FL",
      postalCode: "33602",
      timezone: "America/New_York",
      accountStatus: "ACTIVE",
      acceptingOnlineOrders: true,
      posStatus: "ONLINE",
    });
  });

  it("never invents what Grubhub didn't send", () => {
    expect(mapMerchant({ merchant_id: 42 })).toMatchObject({
      merchantId: "42",
      name: "Grubhub restaurant",
      address: null,
      timezone: null,
      accountStatus: null,
      acceptingOnlineOrders: null,
      posStatus: null,
    });
  });
});

describe("mapOrder (2026-11-19)", () => {
  it("maps a pickup order into row columns, money in cents as sent", () => {
    expect(mapOrder(pickupOrder)).toEqual({
      id: "JylzkoC0Ee2zk-PUFdlLqg",
      merchantId: "10004116752",
      orderNumber: "604721063804098",
      status: "RESTAURANT_CONFIRMABLE",
      fulfillment: "PICKUP",
      scheduling: "ASAP",
      isTest: false,
      placedAt: new Date("2026-11-19T22:18:06.214Z"),
      whenFor: new Date("2026-11-19T22:38:06.221Z"),
      dinerName: "John Doe",
      items: [
        { title: "Margherita", quantity: 1 },
        { title: "Garlic knots", quantity: 2 },
      ],
      itemCount: 3,
      merchantSubtotalCents: 1600,
      taxCents: 120,
      tipCents: 300,
      feesCents: 0,
      merchantTotalCents: 1920,
      grandTotalCents: 2020,
      dinerGrandTotalCents: 2020,
      confirmedAt: null,
      readyAt: null,
      fulfilledAt: null,
      closedAt: null,
      externalOrderId: null,
      timezone: "America/New_York",
    });
  });

  it("reads status times from the history and falls back sanely on a bare order", () => {
    const done = mapOrder({
      ...pickupOrder,
      status: "FULFILLED",
      statusHistory: [
        { status: "CONFIRMED", timestamp: "2026-11-19T22:20:00Z" },
        { status: "PICKUP_READY", timestamp: "2026-11-19T22:35:00Z" },
        { status: "FULFILLED", timestamp: { millis: Date.UTC(2026, 10, 19, 22, 50) } },
      ],
    });
    expect(done.confirmedAt).toEqual(new Date("2026-11-19T22:20:00Z"));
    expect(done.readyAt).toEqual(new Date("2026-11-19T22:35:00Z"));
    expect(done.fulfilledAt).toEqual(new Date("2026-11-19T22:50:00Z"));

    const bare = mapOrder({ uuid: "abcdefghij", status: "weird" });
    expect(bare).toMatchObject({
      orderNumber: "FGHIJ",
      status: "UNKNOWN",
      fulfillment: "UNKNOWN",
      scheduling: "UNKNOWN",
      items: [],
      itemCount: 0,
      merchantTotalCents: null,
      dinerName: null,
      timezone: null,
    });
    expect(bare.placedAt).toBeInstanceOf(Date);
  });

  it("tells pickup, Grubhub delivery and self delivery apart", () => {
    expect(orderFulfillment({ fulfillment_info: { pickup_info: {} } })).toBe("PICKUP");
    expect(orderFulfillment({ fulfillment_info: { delivery_info: { is_managed_delivery: true } } })).toBe("GRUBHUB_DELIVERY");
    expect(orderFulfillment({ fulfillment_info: { delivery_info: { is_managed_delivery: false } } })).toBe("SELF_DELIVERY");
    expect(orderFulfillment({ fulfillment_info: { delivery_info: {} } })).toBe("SELF_DELIVERY");
    expect(orderFulfillment({})).toBe("UNKNOWN");
  });

  it("parseInstant takes ISO strings, epoch millis and Joda objects", () => {
    expect(parseInstant("2026-11-19T22:18:06.214Z")).toEqual(new Date("2026-11-19T22:18:06.214Z"));
    expect(parseInstant(1_700_000_000_000)).toEqual(new Date(1_700_000_000_000));
    expect(parseInstant({ millis: 1_700_000_000_000 })).toEqual(new Date(1_700_000_000_000));
    expect(parseInstant("nope")).toBeNull();
    expect(parseInstant(null)).toBeNull();
  });

  it("reads lines from the diners when the top-level charges carry none (group orders)", () => {
    const grouped: PosOrder = {
      uuid: "g1",
      status: "CONFIRMED",
      diners: [
        { participation: "HOST", diner_info: { name: "Ana" }, charges: { line_groups: [{ lines: [{ name: "Taco", quantity: 3 }] }], merchant_total: 900 } },
      ],
    };
    expect(mapOrder(grouped)).toMatchObject({ items: [{ title: "Taco", quantity: 3 }], itemCount: 3, merchantTotalCents: 900, dinerName: "Ana" });
  });
});

describe("mapOrderDetail (2026-11-19)", () => {
  it("builds lines with grouped options, the customer, pickup notes and the money", () => {
    const d = mapOrderDetail(pickupOrder);
    expect(d.lines[0]).toEqual({
      title: "Margherita",
      quantity: 1,
      unitCents: 1200,
      totalCents: 1200,
      instructions: "Extra crispy",
      options: [
        { group: "Size", items: [{ title: "Large", quantity: 1, priceCents: 200 }] },
        {
          group: "Toppings",
          items: [
            { title: "Basil", quantity: 1, priceCents: 0 },
            { title: "Olives", quantity: 1, priceCents: 100 },
          ],
        },
      ],
    });
    expect(d.lines[1]).toMatchObject({ title: "Garlic knots", quantity: 2, unitCents: 200, totalCents: 400, options: [] });
    expect(d.customer).toEqual({ name: "John Doe", phone: "(222) 222-2222" });
    expect(d.pickup).toEqual({ instructions: "Ring the bell", estimatedPickupAt: null });
    expect(d.delivery).toBeNull();
    expect(d.charges).toEqual({
      merchantSubtotalCents: 1600,
      taxCents: 120,
      feesCents: 0,
      deliveryFeeCents: 0,
      tipCents: 300,
      coupons: [{ text: "$2 off", amountCents: 200 }],
      merchantTotalCents: 1920,
      grandTotalCents: 2020,
      dinerGrandTotalCents: 2020,
    });
    // The diner's email never leaves the payload.
    expect(JSON.stringify(d)).not.toContain("john@example.com");
  });

  it("shows the address only when the restaurant delivers itself", () => {
    const address = { address_line1: "1 Beach Rd", address_line2: "Apt 2", city: "Orlando", state: "FL", zip_code: "32801" };
    const self = mapOrderDetail({
      ...pickupOrder,
      fulfillment_info: { delivery_info: { address, instruction: "Gate code 1234", is_managed_delivery: false, estimated_delivery_time: "2026-11-19T23:00:00Z" } },
    });
    expect(self.fulfillment).toBe("SELF_DELIVERY");
    expect(self.delivery).toEqual({
      isManaged: false,
      address: "1 Beach Rd, Apt 2, Orlando, FL 32801",
      instruction: "Gate code 1234",
      estimatedDeliveryAt: new Date("2026-11-19T23:00:00Z"),
      estimatedDriverPickupAt: null,
    });
    const managed = mapOrderDetail({
      ...pickupOrder,
      fulfillment_info: { delivery_info: { address, is_managed_delivery: true, managed_delivery_estimated_pickup: "2026-11-19T22:40:00Z" } },
    });
    expect(managed.fulfillment).toBe("GRUBHUB_DELIVERY");
    expect(managed.delivery?.address).toBeNull();
    expect(managed.delivery?.estimatedDriverPickupAt).toEqual(new Date("2026-11-19T22:40:00Z"));
    expect(managed.pickup).toBeNull();
  });
});

// ─── State machine ───────────────────────────────────────────────

describe("confirm deadline (2026-11-19)", () => {
  it("is 8 minutes after placing, never negative", () => {
    expect(CONFIRM_WINDOW_MS).toBe(480_000);
    const placed = new Date("2026-11-19T22:00:00Z");
    expect(confirmDeadline(placed, new Date("2026-11-19T22:03:00Z"))).toEqual({ deadline: new Date("2026-11-19T22:08:00Z"), remainingMs: 300_000 });
    expect(confirmDeadline(placed, new Date("2026-11-19T23:00:00Z")).remainingMs).toBe(0);
  });
});

describe("allowedActions (2026-11-19)", () => {
  const none = { confirm: false, reject: false, ready: false, outForDelivery: false, fulfilled: false, requestCancel: false };

  it("new orders: confirm or reject, nothing else", () => {
    for (const f of ["PICKUP", "GRUBHUB_DELIVERY", "SELF_DELIVERY", "UNKNOWN"] as const) {
      expect(allowedActions("RESTAURANT_CONFIRMABLE", f)).toEqual({ ...none, confirm: true, reject: true });
    }
  });

  it("confirmed: ready for pickup and Grubhub delivery, out for delivery when the restaurant drives", () => {
    expect(allowedActions("CONFIRMED", "PICKUP")).toEqual({ ...none, ready: true, requestCancel: true });
    expect(allowedActions("CONFIRMED", "GRUBHUB_DELIVERY")).toEqual({ ...none, ready: true, requestCancel: true });
    expect(allowedActions("CONFIRMED", "SELF_DELIVERY")).toEqual({ ...none, outForDelivery: true, requestCancel: true });
  });

  it("later steps and terminal states", () => {
    expect(allowedActions("PICKUP_READY", "PICKUP")).toEqual({ ...none, requestCancel: true });
    expect(allowedActions("OUT_FOR_DELIVERY", "SELF_DELIVERY")).toEqual({ ...none, fulfilled: true, requestCancel: true });
    expect(allowedActions("OUT_FOR_DELIVERY", "GRUBHUB_DELIVERY")).toEqual({ ...none, requestCancel: true });
    for (const s of ["ANTICIPATED", "FULFILLED", "CANCELLED", "REJECTED", "STALE", "UNKNOWN"] as const) {
      expect(allowedActions(s, "PICKUP")).toEqual(none);
    }
  });
});

describe("Grubhub request bodies (2026-11-19)", () => {
  it("status updates are exactly what the PUT wants", () => {
    expect(statusUpdateBody({ action: "confirm" })).toEqual({ status: "CONFIRMED" });
    expect(statusUpdateBody({ action: "confirm", waitTimeMinutes: 20, externalOrderId: "604721063804098" })).toEqual({
      status: "CONFIRMED",
      wait_time_in_minutes: 20,
      external_order_id: "604721063804098",
    });
    expect(statusUpdateBody({ action: "reject", code: "MENU_ITEM_NOT_FOUND", message: " Out of basil " })).toEqual({
      status: "REJECTED",
      reason_code: "MENU_ITEM_NOT_FOUND",
      message: "Out of basil",
    });
    expect(() => statusUpdateBody({ action: "reject", code: "OTHER", message: "  " })).toThrow();
    expect(statusUpdateBody({ action: "ready" })).toEqual({ status: "PICKUP_READY" });
    expect(statusUpdateBody({ action: "outForDelivery" })).toEqual({ status: "OUT_FOR_DELIVERY" });
    expect(statusUpdateBody({ action: "fulfilled" })).toEqual({ status: "FULFILLED" });
  });

  it("cancel requests carry the change action and the requestor", () => {
    expect(
      cancelRequestBody({
        code: "OUT_OF_ITEM",
        reason: "no more dough",
        agentName: "Ali Samadi",
        requestor: { firstName: "Ali", lastName: "Samadi", email: "a@alisamadii.com" },
      })
    ).toEqual({
      change_action: "cancel.action",
      reason_code: "OUT_OF_ITEM",
      reason: "Out of an item: no more dough",
      restaurant_agent_name: "Ali Samadi",
      requestor_first_name: "Ali",
      requestor_last_name: "Samadi",
      requestor_email: "a@alisamadii.com",
    });
    expect(cancelRequestBody({ code: "TOO_BUSY", reason: "", agentName: "x", requestor: { firstName: "a", lastName: "b", email: "c@d.e" } }).reason).toBe(
      "Kitchen can't take it"
    );
  });

  it("splitName gives Grubhub a first and last name even for one-word names", () => {
    expect(splitName("Ali Samadi", "a@x.com")).toEqual({ firstName: "Ali", lastName: "Samadi" });
    expect(splitName("Ali", "a@x.com")).toEqual({ firstName: "Ali", lastName: "Hub" });
    expect(splitName(null, "owner@x.com")).toEqual({ firstName: "owner", lastName: "Hub" });
  });

  it("the orders window is exactly 24 hours, as GET /orders requires", () => {
    const now = new Date("2026-11-19T12:00:00Z");
    const w = ordersWindow(now);
    expect(w.end).toEqual(now);
    expect(w.end.getTime() - w.start.getTime()).toBe(24 * 60 * 60_000);
  });
});

describe("Grubhub constants (2026-11-19)", () => {
  it("reject codes are Grubhub's four, cancel codes are ours", () => {
    expect([...REJECT_CODES]).toEqual(["RESTAURANT_OFFLINE", "MENU_ITEM_NOT_FOUND", "PRICE_MISMATCH", "OTHER"]);
    expect(CANCEL_CODES).toContain("OTHER");
  });

  it("every status has a label and lands in exactly one page bucket", () => {
    for (const s of ORDER_STATUSES) {
      expect(STATUS_META[s].label.length).toBeGreaterThan(0);
      expect(["open", "completed", "canceled"]).toContain(orderStatusGroup(s));
    }
    expect(orderStatusGroup("RESTAURANT_CONFIRMABLE")).toBe("open");
    expect(orderStatusGroup("FULFILLED")).toBe("completed");
    expect(orderStatusGroup("STALE")).toBe("canceled");
  });

  it("a new order is open but not yet sold; confirmed is both", () => {
    expect(OPEN_ORDER_STATUSES).toContain("RESTAURANT_CONFIRMABLE");
    expect(SOLD_ORDER_STATUSES).not.toContain("RESTAURANT_CONFIRMABLE");
    expect(SOLD_ORDER_STATUSES).toContain("CONFIRMED");
    expect(OPEN_ORDER_STATUSES).toContain("CONFIRMED");
    for (const meta of Object.values(INTEGRATION_META)) expect(meta.text).not.toContain("—");
  });
});
