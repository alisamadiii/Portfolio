/* eslint-disable no-console */
// ─── Stand-in Grubhub Marketplace API for local testing ──────────
// Mirrors the endpoints, MAC signing rules, payloads and webhooks the hub's
// Grubhub app talks to, so the whole flow (connect a merchant → go live →
// orders arriving by webhook → confirm / reject / ready → pause and resume →
// hourly reconcile) runs on a laptop without a real restaurant. Shapes follow
// the Grubhub POS Marketplace API spec (merchant_data_api, orders, onboarding).
//
//   Every /pos/* and /merchant/* call needs X-GH-PARTNER-KEY plus
//   Authorization: MAC id="…",nonce="…"[,bodyhash="…"],mac="…"  (HMAC-SHA256
//   over nonce\nMETHOD\npath+query\nhost\nport\nbodyhash\n\n, keyed with the
//   client secret). Bad partner key / id / bodyhash / mac / replayed nonce = 401.
//
//   GET  /pos/v1/merchant/{id}                              merchant data (pos_merchant_status reflects the hub's pauses)
//   PUT  /pos/v1/merchant/{id}/pos-status                   { new_pos_status: ONLINE | OFFLINE, reason? }  hard pause, 204 + availability webhook
//   POST /pos/v1/merchant/{id}/schedules/closenow|opennow   soft pause until midnight, 200 {} + availability webhook
//   GET  /pos/v1/merchant/{id}/orders?status=&start=&end=   PosOrder[] (end within 24 h of start)
//   GET  /pos/v1/merchant/{id}/orders/{uuid}                PosOrder
//   PUT  /pos/v1/merchant/{id}/orders/{uuid}/status         { status, wait_time_in_minutes?, external_order_id?, reason_code?, message? }  204 + order webhook
//   POST|GET /pos/v1/merchant/{id}/orders/{uuid}/changerequests   ask Care to cancel / adjust; list requests
//   POST /pos/v1/merchant/{id}/test/transmission            { is_delivery, is_catering, is_validation }  test order, 200 "<uuid>"
//   POST /merchant/onboarding/v1/partner/activate           { job_id }  batch answer, activation webhook 3 s later
//   POST /merchant/onboarding/v1/partner/deactivate         { merchant_id }
//   POST /pos/v1/menu/ingestion, GET /pos/v1/menu/ingestion/jobs/{id}   phase 2 stub (job always FAILED)
//
//   webhooks (POST <api>/api/webhook/grubhub, Authorization: Basic user:password, retried
//   every 60 s on 5xx / timeout up to 10 sends, never on a 4xx):
//     Order Status            the full PosOrder on every status change
//     Merchant Availability   { merchant_id, status, name?, end_time?, reason? }
//     Onboarding Activation   { activation_job_id, overall_status, activation_results: [...] }
//     Merchant Configuration  { merchant_ids: [...] }
//   New orders nobody confirms go STALE after 8 minutes and CANCELLED 10 s later, like Grubhub's reaper.
//
// Not Grubhub (the control panel): GET / and POST /_mock/* create orders, move
// them along, cancel, approve change requests, pause deliveries, trigger the
// hub's reconcile cron. State lives in memory; restart or Reset = fresh.
//
// Run:  pnpm grubhub:mock          (reads apps/api/.env for the credentials)
// Then in apps/api/.env:  GRUBHUB_API_URL=http://localhost:4011
//                         GRUBHUB_PARTNER_KEY=mock-partner
//                         GRUBHUB_CLIENT_ID=sv:v1:00000000-0000-0000-0000-000000000000
//                         GRUBHUB_CLIENT_SECRET=mock-secret
//                         GRUBHUB_ISSUE_DATE=2024-01-01
//                         GRUBHUB_WEBHOOK_USER=hub
//                         GRUBHUB_WEBHOOK_PASSWORD=hub-secret
// (any values work as long as the mock and the api read the same ones).

import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Config ──────────────────────────────────────────────────────

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, "../.env");
const fileEnv: Record<string, string> = {};
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#")) fileEnv[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
}
const env = (key: string, fallback = "") => process.env[key] ?? fileEnv[key] ?? fallback;

const PORT = Number(env("GRUBHUB_MOCK_PORT", "4011"));
const PARTNER_KEY = env("GRUBHUB_PARTNER_KEY", "mock-partner");
const CLIENT_ID = env("GRUBHUB_CLIENT_ID", "sv:v1:00000000-0000-0000-0000-000000000000");
const CLIENT_SECRET = env("GRUBHUB_CLIENT_SECRET", "mock-secret");
const WEBHOOK_USER = env("GRUBHUB_WEBHOOK_USER", "hub");
const WEBHOOK_PASSWORD = env("GRUBHUB_WEBHOOK_PASSWORD", "hub-secret");
const API_URL = env("NEXT_PUBLIC_API_URL", "http://localhost:3000").replace(/\/$/, "");
const WEBHOOK_URL = env("GRUBHUB_MOCK_WEBHOOK_URL", `${API_URL}/api/webhook/grubhub`);
const INTERNAL_API_SECRET = env("INTERNAL_API_SECRET");
const SELF = `http://localhost:${PORT}`;

const STALE_AFTER_MS = 8 * 60_000;
const STALE_TO_CANCEL_MS = 10_000;
const WEBHOOK_RETRY_MS = 60_000;
const WEBHOOK_MAX_ATTEMPTS = 10;

// ─── Data ────────────────────────────────────────────────────────

type PosStatus = "ONLINE" | "OFFLINE";
type OrderKind = "pickup" | "managed" | "self";
type OrderStatus =
  | "ANTICIPATED"
  | "RESTAURANT_CONFIRMABLE"
  | "CONFIRMED"
  | "PICKUP_READY"
  | "OUT_FOR_DELIVERY"
  | "FULFILLED"
  | "CANCELLED"
  | "REJECTED"
  | "STALE";

type Merchant = {
  merchant_id: string;
  merchant_uuid: string;
  name: string;
  address: { street_address: string; locality: string; region: string; postal_code: string; time_zone: string };
  menu: MenuItem[];
  // Mock-side state, not part of the Grubhub payload.
  posStatus: PosStatus;
  closedToday: boolean;
  integrationLive: boolean;
  escalated: boolean;
};

type MenuOptionGroup = { label: string; pick: 1 | 2; options: { name: string; price: number }[] };
type MenuItem = { name: string; price: number; options?: MenuOptionGroup[] };

type ContactInfo = { phone: string; name: string };
type LineOption = { label: string; name: string; price: number; quantity: number };
type Line = {
  name: string;
  quantity: number;
  price: number;
  merchant_price: number;
  total: number;
  merchant_total: number;
  diner_total: number;
  special_instructions: string;
  line_options: LineOption[];
  external_id: null;
  line_uuid: string;
};
type Charges = {
  fees: { total: number; delivery: number };
  taxes: { total: number; sales: number; restaurant: number; merchant_total: number };
  tip: { amount: number; type: "CASH" };
  diner_grand_total: number;
  grand_total: number;
  adjusted_grand_total: number;
  coupons: never[];
  merchant_total: number;
  merchant_subtotal: number;
  restaurant_subtotal: number;
  merchant_subtotal_before_coupons: number;
  line_groups: { label: string; lines: Line[] }[];
};
type HistoryEntry = { status: OrderStatus; timestamp: string; update_source: string; reason?: string };

type PosOrder = {
  uuid: string;
  order_number: string;
  merchant_id: string;
  order_merchant_id: string;
  status: OrderStatus;
  is_test: boolean;
  time_placed: string;
  when_for: string;
  restaurant_timezone_id: string;
  fulfillment_scheduling: "ASAP" | "FUTURE";
  order_type: "STANDARD";
  statusHistory: HistoryEntry[];
  fulfillment_info:
    | { pickup_info: { name: string; contact_info: ContactInfo; instructions: string } }
    | {
        delivery_info: {
          address: { address_line1: string; address_line2?: string; city: string; state: string; zip_code: string };
          contact_info: ContactInfo;
          instruction: string;
          is_managed_delivery: boolean;
          estimated_delivery_time: string;
          managed_delivery_estimated_pickup?: string;
        };
      };
  diners: { status: "ACTIVE"; diner_info: ContactInfo; participation: "HOST" }[];
  charges: Charges;
  payments: { payments: { payment_type: "CREDIT_CARD"; amount: number; tax_application: "POST_TAX" }[]; total: number };
  external_order_id: string | null;
  wait_time_in_minutes?: number;
  brand: "GRUBHUB";
};

type ChangeRequest = {
  change_request_id: string;
  order_id: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  ticket_id: number;
  requested_action: string;
  request: Record<string, unknown>;
};

const PIZZA_OPTIONS: MenuOptionGroup[] = [
  { label: "Size", pick: 1, options: [{ name: "12 inch", price: 0 }, { name: "14 inch", price: 200 }, { name: "16 inch", price: 500 }] },
  { label: "Toppings", pick: 2, options: [{ name: "Mushrooms", price: 150 }, { name: "Black olives", price: 150 }, { name: "Extra cheese", price: 250 }] },
];
const PIZZA_MENU: MenuItem[] = [
  { name: "Margherita", price: 1699, options: PIZZA_OPTIONS },
  { name: "Pepperoni", price: 1899, options: PIZZA_OPTIONS },
  { name: "Garlic Knots (6)", price: 699 },
  { name: "Caesar Salad", price: 999, options: [{ label: "Dressing", pick: 1, options: [{ name: "On the side", price: 0 }, { name: "Mixed in", price: 0 }] }] },
  { name: "Tiramisu", price: 799 },
];
const PHO_OPTIONS: MenuOptionGroup[] = [
  { label: "Size", pick: 1, options: [{ name: "Regular", price: 0 }, { name: "Large", price: 300 }] },
  { label: "Extras", pick: 2, options: [{ name: "Extra noodles", price: 200 }, { name: "Brisket", price: 350 }, { name: "Meatballs", price: 300 }] },
];
const PHO_MENU: MenuItem[] = [
  { name: "Pho Tai (rare steak)", price: 1499, options: PHO_OPTIONS },
  { name: "Pho Ga (chicken)", price: 1399, options: PHO_OPTIONS },
  { name: "Spring Rolls (2)", price: 649 },
  { name: "Banh Mi", price: 999, options: [{ label: "Protein", pick: 1, options: [{ name: "Grilled pork", price: 0 }, { name: "Tofu", price: 0 }, { name: "Lemongrass chicken", price: 100 }] }] },
  { name: "Vietnamese Iced Coffee", price: 549 },
];

const mkMerchant = (m: Pick<Merchant, "merchant_id" | "merchant_uuid" | "name" | "address" | "menu">): Merchant => ({
  ...m,
  posStatus: "ONLINE",
  closedToday: false,
  integrationLive: false,
  escalated: false,
});

const merchants: Merchant[] = [
  mkMerchant({
    merchant_id: "1234567",
    merchant_uuid: "0OfxgNelEey87BGSJG9AHg",
    name: "Tony's Pizzeria",
    address: { street_address: "901 N Franklin St", locality: "Tampa", region: "FL", postal_code: "33602", time_zone: "America/New_York" },
    menu: PIZZA_MENU,
  }),
  mkMerchant({
    merchant_id: "7654321",
    merchant_uuid: "Qm5sPho2Ee2kAbCdEfGhIj",
    name: "Pho House",
    address: { street_address: "501 E Central Blvd", locality: "Orlando", region: "FL", postal_code: "32801", time_zone: "America/New_York" },
    menu: PHO_MENU,
  }),
];

const orders = new Map<string, PosOrder>();
const changeRequests: ChangeRequest[] = [];
const menuJobs = new Map<string, { job_id: string; status: string; message: string }>();
let staleTimerOn = true;
let deliveriesPaused = false;

const log: Array<{ at: string; line: string }> = [];
const note = (line: string) => {
  const at = new Date().toISOString().slice(11, 19);
  log.unshift({ at, line });
  if (log.length > 200) log.pop();
  console.log(`[grubhub-mock ${at}] ${line}`);
};

/** GET /pos/v1/merchant/{id} body, as in merchant_data_api.json. */
const merchantData = (m: Merchant) => ({
  merchant_id: m.merchant_id,
  merchant_uuid: m.merchant_uuid,
  name: m.name,
  address: m.address,
  account_status: {
    merchant_status: "ACTIVE",
    merchant_status_descriptor: "Active",
    pos_merchant_status: m.posStatus,
    accepting_online_orders: true,
    holds_active_account: true,
  },
  service_type: "DELIVERY AND PICKUP",
  merchant_status_by_order_type: { STANDARD: m.posStatus },
  order_processing_info: { scheduled_orders: true, pos_integrated: m.integrationLive },
});

const DINERS = [
  "Sam Ortiz", "Priya Natarajan", "Marcus Bell", "Elena Petrova", "Jordan Lee",
  "Aisha Rahman", "Noah Fischer", "Camila Reyes", "Theo Okafor", "Grace Kim",
];
const STREETS = ["1402 W Kennedy Blvd", "310 S Orange Ave", "77 Bayshore Dr", "2201 N Dale Mabry Hwy", "815 E Pine St"];
const INSTRUCTIONS = ["", "", "Extra napkins please", "Ring the bell, baby sleeping", "No onions", "Leave at the door"];
const LINE_NOTES = ["", "", "", "Extra sauce on the side", "Cut in squares", "Light salt", "No cilantro"];
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]!;
const phone = () => `(${pick(["813", "407", "727"])}) 555-0${100 + Math.floor(Math.random() * 900)}`;
const digits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
const uuid22 = () => randomBytes(16).toString("base64url");
const iso = (d: Date) => d.toISOString();

const buildLine = (item: MenuItem): Line => {
  const quantity = 1 + Math.floor(Math.random() * 2);
  const options: LineOption[] = (item.options ?? []).flatMap((group) => {
    const chosen = [...group.options].sort(() => Math.random() - 0.5).slice(0, group.pick === 1 ? 1 : Math.floor(Math.random() * 3));
    return chosen.map((o) => ({ label: group.label, name: o.name, price: o.price, quantity: 1 }));
  });
  const unit = item.price + options.reduce((n, o) => n + o.price, 0);
  const total = unit * quantity;
  return {
    name: item.name,
    quantity,
    price: item.price,
    merchant_price: item.price,
    total,
    merchant_total: total,
    diner_total: total,
    special_instructions: pick(LINE_NOTES),
    line_options: options,
    external_id: null,
    line_uuid: uuid22(),
  };
};

const createOrder = (merchant: Merchant, opts: { kind: OrderKind; future?: boolean; test?: boolean }): PosOrder => {
  const placed = new Date();
  const whenFor = new Date(placed.getTime() + (opts.future ? 2 * 60 * 60_000 : 20 * 60_000));
  const count = 1 + Math.floor(Math.random() * 3);
  const lines = [...merchant.menu].sort(() => Math.random() - 0.5).slice(0, count).map(buildLine);
  const subtotal = lines.reduce((n, l) => n + l.total, 0);
  const tax = Math.round(subtotal * 0.07);
  const deliveryFee = opts.kind === "managed" ? 299 : opts.kind === "self" ? 399 : 0;
  const tip = opts.kind === "pickup" ? (Math.random() < 0.5 ? 0 : Math.round(subtotal * 0.1)) : Math.round(subtotal * 0.15);
  const grand = subtotal + tax + deliveryFee + tip;
  const name = pick(DINERS);
  const contact: ContactInfo = { phone: phone(), name };
  const status: OrderStatus = opts.future ? "ANTICIPATED" : "RESTAURANT_CONFIRMABLE";
  const fulfillment_info: PosOrder["fulfillment_info"] =
    opts.kind === "pickup"
      ? { pickup_info: { name, contact_info: contact, instructions: pick(INSTRUCTIONS) } }
      : {
          delivery_info: {
            address: {
              address_line1: pick(STREETS),
              ...(Math.random() < 0.4 ? { address_line2: `Apt ${100 + Math.floor(Math.random() * 900)}` } : {}),
              city: merchant.address.locality,
              state: merchant.address.region,
              zip_code: merchant.address.postal_code,
            },
            contact_info: contact,
            instruction: pick(INSTRUCTIONS),
            is_managed_delivery: opts.kind === "managed",
            estimated_delivery_time: iso(new Date(whenFor.getTime() + 15 * 60_000)),
            ...(opts.kind === "managed" ? { managed_delivery_estimated_pickup: iso(whenFor) } : {}),
          },
        };
  const order: PosOrder = {
    uuid: uuid22(),
    order_number: digits(15),
    merchant_id: merchant.merchant_id,
    order_merchant_id: uuid22(),
    status,
    is_test: opts.test === true,
    time_placed: iso(placed),
    when_for: iso(whenFor),
    restaurant_timezone_id: merchant.address.time_zone,
    fulfillment_scheduling: opts.future ? "FUTURE" : "ASAP",
    order_type: "STANDARD",
    statusHistory: [{ status, timestamp: iso(placed), update_source: "TXS" }],
    fulfillment_info,
    diners: [{ status: "ACTIVE", diner_info: contact, participation: "HOST" }],
    charges: {
      fees: { total: deliveryFee, delivery: deliveryFee },
      taxes: { total: tax, sales: tax, restaurant: tax, merchant_total: tax },
      tip: { amount: tip, type: "CASH" },
      diner_grand_total: grand,
      grand_total: grand,
      adjusted_grand_total: grand,
      coupons: [],
      merchant_total: subtotal + tax + tip,
      merchant_subtotal: subtotal,
      restaurant_subtotal: subtotal,
      merchant_subtotal_before_coupons: subtotal,
      line_groups: [{ label: "Group 1", lines }],
    },
    payments: { payments: [{ payment_type: "CREDIT_CARD", amount: grand, tax_application: "POST_TAX" }], total: grand },
    external_order_id: null,
    brand: "GRUBHUB",
  };
  orders.set(order.uuid, order);
  return order;
};

const orderKind = (o: PosOrder): OrderKind =>
  "pickup_info" in o.fulfillment_info ? "pickup" : o.fulfillment_info.delivery_info.is_managed_delivery ? "managed" : "self";

const merchantOf = (o: PosOrder) => merchants.find((m) => m.merchant_id === o.merchant_id);

/** Moves an order, records history, and tells the hub. */
const setStatus = (o: PosOrder, status: OrderStatus, update_source: string, reason?: string) => {
  o.status = status;
  o.statusHistory.push({ status, timestamp: iso(new Date()), update_source, ...(reason ? { reason } : {}) });
  note(`order #${o.order_number.slice(-6)} -> ${status} (${update_source})`);
  sendWebhook("order", o, `order #${o.order_number.slice(-6)} ${status}`);
};

const nextMidnight = (timeZone: string) => {
  // Midnight in the store's zone: find the next local day start by probing hourly.
  const now = new Date();
  const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const today = dayOf(now);
  let probe = new Date(now.getTime() + 60 * 60_000);
  while (dayOf(probe) === today) probe = new Date(probe.getTime() + 60 * 60_000);
  // Back up minute by minute to the first minute of the new day.
  while (dayOf(new Date(probe.getTime() - 60_000)) !== today) probe = new Date(probe.getTime() - 60_000);
  probe.setSeconds(0, 0);
  return probe;
};

// ─── Webhooks (Basic auth, retried like Grubhub) ─────────────────

type Delivery = {
  id: string;
  kind: string;
  summary: string;
  attempts: number;
  lastStatus: string;
  nextAt: number;
  done: boolean;
  inflight: boolean;
  body: string;
};
const deliveries: Delivery[] = [];

const sendWebhook = (kind: string, body: unknown, summary = kind) => {
  const delivery: Delivery = {
    id: randomUUID(),
    kind,
    summary,
    attempts: 0,
    lastStatus: deliveriesPaused ? "held" : "pending",
    nextAt: Date.now(),
    done: false,
    inflight: false,
    body: JSON.stringify(body),
  };
  deliveries.unshift(delivery);
  if (deliveries.length > 100) deliveries.pop();
  void pumpDeliveries();
  return delivery;
};

const attemptDelivery = async (d: Delivery) => {
  d.inflight = true;
  d.attempts++;
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${WEBHOOK_USER}:${WEBHOOK_PASSWORD}`).toString("base64")}`,
      },
      body: d.body,
      signal: AbortSignal.timeout(10_000),
    });
    d.lastStatus = String(res.status);
    note(`webhook ${d.kind} (${d.summary}) -> ${res.status} (attempt ${d.attempts})`);
    // Grubhub retries on 5xx / timeouts only; any 4xx is final.
    if (res.status < 500) {
      d.done = true;
      d.inflight = false;
      return;
    }
  } catch (error) {
    d.lastStatus = "unreachable";
    note(`webhook ${d.kind} (${d.summary}) -> unreachable (${(error as Error).message}, attempt ${d.attempts})`);
  }
  d.inflight = false;
  if (d.attempts >= WEBHOOK_MAX_ATTEMPTS) {
    d.done = true;
    note(`webhook ${d.kind} gave up after ${d.attempts} sends`);
    return;
  }
  d.nextAt = Date.now() + WEBHOOK_RETRY_MS;
};

/** Sends whatever is due. Paused = everything waits in the queue. */
const pumpDeliveries = async () => {
  if (deliveriesPaused) return;
  const now = Date.now();
  const due = deliveries.filter((d) => !d.done && !d.inflight && d.nextAt <= now);
  // Oldest first so order webhooks arrive in the order they happened.
  await Promise.all(due.reverse().map(attemptDelivery));
};
setInterval(() => void pumpDeliveries(), 1_000);

// ─── Auto-stale (Grubhub's orders reaper) ────────────────────────

const goStale = (o: PosOrder) => {
  if (o.status !== "RESTAURANT_CONFIRMABLE") return;
  setStatus(o, "STALE", "GRUBHUB_ORDERS_REAPER", `Stuck status RESTAURANT_CONFIRMABLE at ${iso(new Date())}`);
  setTimeout(() => {
    if (o.status === "STALE") setStatus(o, "CANCELLED", "CONFIRMATION_AUTOMATION");
  }, STALE_TO_CANCEL_MS);
};

setInterval(() => {
  if (!staleTimerOn) return;
  const cutoff = Date.now() - STALE_AFTER_MS;
  for (const o of orders.values()) {
    if (o.status === "RESTAURANT_CONFIRMABLE" && new Date(o.time_placed).getTime() <= cutoff) goStale(o);
  }
}, 5_000);

// ─── HTTP plumbing ───────────────────────────────────────────────

type Req = IncomingMessage & { body: string; url: string; method: string };

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });

const json = (res: ServerResponse, status: number, body?: unknown) => {
  if (body === undefined) {
    res.writeHead(status);
    res.end();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};
const html = (res: ServerResponse, body: string, status = 200) => {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
};
const redirect = (res: ServerResponse, to: string) => {
  res.writeHead(302, { Location: to });
  res.end();
};
/** Grubhub's error envelope. */
const fail = (res: ServerResponse, status: number, message: string, extra: Record<string, unknown> = {}) =>
  json(res, status, { http_status: status, error_message: message, ...extra });

const parseJson = (body: string) => {
  try {
    return body ? (JSON.parse(body) as Record<string, unknown>) : {};
  } catch {
    return null;
  }
};

// ─── MAC authentication ──────────────────────────────────────────

const seenNonces: string[] = [];
const nonceSet = new Set<string>();
const rememberNonce = (nonce: string) => {
  seenNonces.push(nonce);
  nonceSet.add(nonce);
  while (seenNonces.length > 500) nonceSet.delete(seenNonces.shift()!);
};

const parseMacHeader = (header: string | undefined) => {
  if (!header) return null;
  const m = /^MAC\s+(.+)$/i.exec(header.trim());
  if (!m) return null;
  const parts: Record<string, string> = {};
  for (const pair of m[1]!.matchAll(/(\w+)="([^"]*)"/g)) parts[pair[1]!] = pair[2]!;
  if (!parts.id || !parts.nonce || !parts.mac) return null;
  return { id: parts.id, nonce: parts.nonce, bodyhash: parts.bodyhash ?? null, ext: parts.ext ?? "", mac: parts.mac };
};

const safeEqual = (a: string, b: string) => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

/** 401 with Grubhub's envelope unless the partner key, MAC id, body hash, signature and nonce all check out. */
const authenticate = (req: Req, res: ServerResponse): boolean => {
  const partnerKey = req.headers["x-gh-partner-key"];
  if (partnerKey !== PARTNER_KEY) {
    fail(res, 401, "invalid partner key");
    return false;
  }
  const mac = parseMacHeader(req.headers.authorization);
  if (!mac) {
    fail(res, 401, "missing or malformed MAC Authorization header");
    return false;
  }
  if (mac.id !== CLIENT_ID) {
    fail(res, 401, "unknown MAC id");
    return false;
  }
  if (req.body) {
    const expected = createHash("sha256").update(req.body, "utf8").digest("base64");
    if (!mac.bodyhash || !safeEqual(mac.bodyhash, expected)) {
      fail(res, 401, "bodyhash does not match the request body");
      return false;
    }
  } else if (mac.bodyhash) {
    fail(res, 401, "bodyhash given for a request without a body");
    return false;
  }
  const hostHeader = req.headers.host ?? "";
  const colon = hostHeader.lastIndexOf(":");
  const host = (colon > 0 ? hostHeader.slice(0, colon) : hostHeader).toLowerCase();
  const port = colon > 0 ? hostHeader.slice(colon + 1) : "80";
  const normalized = `${mac.nonce}\n${req.method.toUpperCase()}\n${req.url}\n${host}\n${port}\n${mac.bodyhash ?? ""}\n${mac.ext}\n`;
  const expectedMac = createHmac("sha256", CLIENT_SECRET).update(normalized, "utf8").digest("base64");
  if (!safeEqual(mac.mac, expectedMac)) {
    console.log(`[grubhub-mock] MAC mismatch. Expected the client to sign:\n${JSON.stringify(normalized)}`);
    fail(res, 401, "invalid MAC signature");
    return false;
  }
  if (nonceSet.has(mac.nonce)) {
    fail(res, 401, "nonce already used");
    return false;
  }
  rememberNonce(mac.nonce);
  return true;
};

// ─── Routes ──────────────────────────────────────────────────────

const REJECT_CODES = ["RESTAURANT_OFFLINE", "MENU_ITEM_NOT_FOUND", "PRICE_MISMATCH", "OTHER"];
const CHANGE_ACTIONS = ["adjust.action", "cancel.action", "substitution.action"];
const PARTNER_STATUSES: OrderStatus[] = ["CONFIRMED", "REJECTED", "PICKUP_READY", "OUT_FOR_DELIVERY", "FULFILLED"];

const availabilityWebhook = (m: Merchant, body: { status: PosStatus; name?: string; end_time?: string; reason?: string }) =>
  sendWebhook("availability", { merchant_id: m.merchant_id, ...body }, `${m.name} ${body.status}${body.end_time ? " (soft)" : ""}`);

const activationWebhook = (jobId: string) => {
  const now = iso(new Date());
  for (const m of merchants) m.integrationLive = true;
  return sendWebhook(
    "activation",
    {
      activation_job_id: jobId,
      overall_status: "SUCCESS",
      overall_details: "Batch processing completed",
      activation_results: merchants.map((m) => ({
        merchant_id: m.merchant_id,
        status: "SUCCESSFUL",
        reason_code: "SUCCESSFUL",
        reason_message: "",
        live_date: now,
      })),
      event_id: randomUUID(),
      requested_time: now,
      partner_id: PARTNER_KEY,
      tracking_id: randomUUID(),
    },
    `activation ${jobId.slice(0, 8)}`
  );
};

const route = async (req: Req, res: ServerResponse) => {
  const url = new URL(req.url, SELF);
  const p = url.pathname;
  const m = (re: RegExp) => re.exec(p);

  // ── Control panel (not Grubhub) ──
  if (p === "/" && req.method === "GET") return html(res, dashboard());
  if (p.startsWith("/_mock/") && req.method === "POST") return control(req, res, p);

  if (!(p.startsWith("/pos/") || p.startsWith("/merchant/"))) return fail(res, 404, `No route for ${req.method} ${p}`);
  if (!authenticate(req, res)) return;

  // ── Onboarding ──
  if (req.method === "POST" && p === "/merchant/onboarding/v1/partner/activate") {
    const body = parseJson(req.body);
    const jobId = body && typeof body.job_id === "string" ? body.job_id : null;
    if (!jobId) return fail(res, 400, "job_id is required");
    note(`activate: job ${jobId} kicked off, live in 3 s`);
    setTimeout(() => activationWebhook(jobId), 3_000);
    return json(res, 200, {
      batch_id: randomUUID(),
      merchant_activation_enablement_response: merchants.map((mm) => ({ cust_id: Number(mm.merchant_id), kicked_off_enablement: true, reason: [] })),
    });
  }
  if (req.method === "POST" && p === "/merchant/onboarding/v1/partner/deactivate") {
    const body = parseJson(req.body);
    const id = body && (typeof body.merchant_id === "string" || typeof body.merchant_id === "number") ? String(body.merchant_id) : null;
    const merchant = merchants.find((mm) => mm.merchant_id === id);
    if (!merchant) return fail(res, 404, "Merchant not found");
    merchant.integrationLive = false;
    note(`deactivate: ${merchant.name} integration off`);
    return json(res, 200, { merchant_id: merchant.merchant_id, status: "SUCCESS" });
  }

  // ── Menu (phase 2 stub) ──
  if (req.method === "POST" && p === "/pos/v1/menu/ingestion") {
    const job = { job_id: randomUUID(), status: "FAILED", message: "menu_url returned 404" };
    menuJobs.set(job.job_id, job);
    note(`menu ingestion job ${job.job_id} recorded (will report FAILED)`);
    return json(res, 200, { job_id: job.job_id });
  }
  let r = m(/^\/pos\/v1\/menu\/ingestion\/jobs\/([^/]+)$/);
  if (r && req.method === "GET") {
    const job = menuJobs.get(decodeURIComponent(r[1]!));
    if (!job) return fail(res, 404, "Job not found");
    return json(res, 200, job);
  }

  // ── Merchant ──
  r = m(/^\/pos\/v1\/merchant\/([^/]+)(\/.*)?$/);
  if (!r) return fail(res, 404, `No route for ${req.method} ${p}`);
  const merchant = merchants.find((mm) => mm.merchant_id === decodeURIComponent(r![1]!));
  if (!merchant) return fail(res, 404, "Merchant not found");
  const rest = r[2] ?? "";

  if (rest === "" && req.method === "GET") return json(res, 200, merchantData(merchant));

  if (rest === "/pos-status" && req.method === "PUT") {
    const body = parseJson(req.body);
    const status = body?.new_pos_status;
    if (status !== "ONLINE" && status !== "OFFLINE") return fail(res, 400, "new_pos_status must be ONLINE or OFFLINE");
    const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : undefined;
    if (status === "ONLINE" && merchant.escalated) {
      return json(res, 409, {
        http_status: 409,
        http_status_value: "Conflict",
        error_message: `Invalid status=ONLINE received for merchantId=${merchant.merchant_id}`,
        occurred: iso(new Date()),
      });
    }
    merchant.posStatus = status;
    note(`pos-status: ${merchant.name} -> ${status}${reason ? ` (${reason})` : ""}`);
    json(res, 204);
    availabilityWebhook(merchant, { status, ...(reason ? { reason } : {}) });
    return;
  }

  if ((rest === "/schedules/closenow" || rest === "/schedules/opennow") && req.method === "POST") {
    const closing = rest === "/schedules/closenow";
    merchant.closedToday = closing;
    note(`${closing ? "closenow" : "opennow"}: ${merchant.name}`);
    json(res, 200, {});
    availabilityWebhook(merchant, {
      status: closing ? "OFFLINE" : "ONLINE",
      name: "DELIVERY",
      end_time: iso(closing ? nextMidnight(merchant.address.time_zone) : new Date()),
      ...(closing ? { reason: "Closed for the rest of today from the POS." } : {}),
    });
    return;
  }

  if (rest === "/test/transmission" && req.method === "POST") {
    const body = parseJson(req.body);
    if (!body) return fail(res, 400, "Malformed JSON");
    const order = createOrder(merchant, { kind: body.is_delivery === true ? "managed" : "pickup", test: true });
    note(`test order #${order.order_number.slice(-6)} at ${merchant.name} (${orderKind(order)})`);
    json(res, 200, order.uuid);
    sendWebhook("order", order, `test order #${order.order_number.slice(-6)} ${order.status}`);
    return;
  }

  if (rest === "/orders" && req.method === "GET") {
    const statuses = url.searchParams.getAll("status");
    const start = url.searchParams.get("start") ? new Date(url.searchParams.get("start")!) : null;
    const end = url.searchParams.get("end") ? new Date(url.searchParams.get("end")!) : null;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) return fail(res, 400, "start and end must be ISO timestamps");
    if (start && end && end.getTime() - start.getTime() > 24 * 60 * 60_000) return fail(res, 400, "end must be within 24 hours of start");
    const list = [...orders.values()].filter((o) => {
      if (o.merchant_id !== merchant.merchant_id) return false;
      if (statuses.length && !statuses.includes(o.status)) return false;
      const placed = new Date(o.time_placed).getTime();
      if (start && placed < start.getTime()) return false;
      if (end && placed > end.getTime()) return false;
      return true;
    });
    return json(res, 200, list);
  }

  r = /^\/orders\/([^/]+)(\/status|\/changerequests)?$/.exec(rest);
  if (!r) return fail(res, 404, `No route for ${req.method} ${p}`);
  const order = orders.get(decodeURIComponent(r[1]!));
  if (!order || order.merchant_id !== merchant.merchant_id) return fail(res, 404, "Order not found");
  const sub = r[2] ?? "";

  if (sub === "" && req.method === "GET") return json(res, 200, order);

  if (sub === "/status" && req.method === "PUT") {
    const body = parseJson(req.body);
    if (!body) return fail(res, 400, "Malformed JSON");
    const to = body.status as OrderStatus;
    if (!PARTNER_STATUSES.includes(to)) return fail(res, 400, `status must be one of ${PARTNER_STATUSES.join(", ")}`);
    const from = order.status;
    const kind = orderKind(order);
    const invalid = () => fail(res, 409, `Invalid transition ${from} -> ${to}`);
    if (to === "CONFIRMED" || to === "REJECTED") {
      if (from !== "RESTAURANT_CONFIRMABLE") return invalid();
      if (to === "REJECTED") {
        if (typeof body.reason_code !== "string" || !REJECT_CODES.includes(body.reason_code)) return fail(res, 400, `reason_code must be one of ${REJECT_CODES.join(", ")}`);
        if (typeof body.message !== "string" || !body.message.trim()) return fail(res, 400, "message is required when rejecting");
      }
    } else if (to === "PICKUP_READY") {
      if (kind === "self") return fail(res, 409, "PICKUP_READY is not valid for self-delivery orders");
      if (from !== "CONFIRMED") return invalid();
    } else if (to === "OUT_FOR_DELIVERY") {
      if (kind !== "self") return fail(res, 409, "OUT_FOR_DELIVERY is only valid for self-delivery orders");
      if (from !== "CONFIRMED" && from !== "PICKUP_READY") return invalid();
    } else if (to === "FULFILLED") {
      if (kind !== "self") return fail(res, 409, "FULFILLED is only valid for self-delivery orders");
      if (from !== "OUT_FOR_DELIVERY") return invalid();
    }
    if (typeof body.external_order_id === "string" && body.external_order_id.trim()) order.external_order_id = body.external_order_id.trim();
    if (typeof body.wait_time_in_minutes === "number") order.wait_time_in_minutes = body.wait_time_in_minutes;
    json(res, 204);
    setStatus(order, to, "POS", to === "REJECTED" ? `${body.reason_code as string}: ${(body.message as string).trim()}` : undefined);
    return;
  }

  if (sub === "/changerequests" && req.method === "GET") {
    return json(res, 200, changeRequests.filter((c) => c.order_id === order.uuid));
  }
  if (sub === "/changerequests" && req.method === "POST") {
    const body = parseJson(req.body);
    if (!body) return fail(res, 400, "Malformed JSON");
    if (typeof body.change_action !== "string" || !CHANGE_ACTIONS.includes(body.change_action)) return fail(res, 400, `change_action must be one of ${CHANGE_ACTIONS.join(", ")}`);
    if (typeof body.requestor_email !== "string" || !body.requestor_email.trim()) return fail(res, 400, "requestor_email is required");
    if (!["CONFIRMED", "PICKUP_READY", "OUT_FOR_DELIVERY"].includes(order.status)) return fail(res, 409, `Change requests need a confirmed order (order is ${order.status})`);
    const cr: ChangeRequest = {
      change_request_id: randomUUID(),
      order_id: order.uuid,
      status: "PENDING",
      ticket_id: 100000 + Math.floor(Math.random() * 900000),
      requested_action: body.change_action,
      request: body,
    };
    changeRequests.unshift(cr);
    note(`change request ${cr.requested_action} on #${order.order_number.slice(-6)} (${String(body.reason ?? "")})`);
    return json(res, 200, cr);
  }

  return fail(res, 404, `No route for ${req.method} ${p}`);
};

// ─── Control panel actions ───────────────────────────────────────

const control = async (req: Req, res: ServerResponse, p: string) => {
  const form = new URLSearchParams(req.body);
  const merchant = merchants.find((mm) => mm.merchant_id === form.get("merchant"));
  const o = orders.get(form.get("uuid") ?? "");
  switch (p) {
    case "/_mock/order": {
      if (!merchant) return fail(res, 400, "merchant?");
      const kind = (form.get("kind") as OrderKind) || "pickup";
      const created = createOrder(merchant, { kind: ["pickup", "managed", "self"].includes(kind) ? kind : "pickup", future: form.get("future") === "on", test: form.get("test") === "on" });
      note(`order #${created.order_number.slice(-6)} placed at ${merchant.name} (${orderKind(created)}${created.fulfillment_scheduling === "FUTURE" ? ", future" : ""}${created.is_test ? ", test" : ""}, ${created.charges.line_groups[0]!.lines.length} lines)`);
      sendWebhook("order", created, `order #${created.order_number.slice(-6)} ${created.status}`);
      break;
    }
    case "/_mock/advance":
      if (o && orderKind(o) === "managed") {
        if (o.status === "CONFIRMED" || o.status === "PICKUP_READY") setStatus(o, "OUT_FOR_DELIVERY", "GRUBHUB_DELIVERY");
        else if (o.status === "OUT_FOR_DELIVERY") setStatus(o, "FULFILLED", "GRUBHUB_DELIVERY");
      }
      break;
    case "/_mock/fulfill":
      if (o && !["FULFILLED", "CANCELLED", "REJECTED", "STALE"].includes(o.status)) setStatus(o, "FULFILLED", orderKind(o) === "managed" ? "GRUBHUB_DELIVERY" : "POS");
      break;
    case "/_mock/diner-cancel":
      if (o && !["FULFILLED", "CANCELLED", "REJECTED"].includes(o.status)) setStatus(o, "CANCELLED", "DINER");
      break;
    case "/_mock/stale":
      if (o) goStale(o);
      break;
    case "/_mock/approve-cancel":
    case "/_mock/deny-cancel": {
      const cr = changeRequests.find((c) => c.change_request_id === form.get("id"));
      if (cr && cr.status === "PENDING") {
        const approve = p === "/_mock/approve-cancel";
        cr.status = approve ? "APPROVED" : "DENIED";
        const target = orders.get(cr.order_id);
        note(`change request ${cr.requested_action} ${cr.status.toLowerCase()} by Care`);
        if (approve && target && cr.requested_action === "cancel.action" && !["FULFILLED", "CANCELLED"].includes(target.status)) setStatus(target, "CANCELLED", "CARE");
      }
      break;
    }
    case "/_mock/availability":
      if (merchant) {
        const status = form.get("status") === "OFFLINE" ? "OFFLINE" : "ONLINE";
        const soft = form.get("soft") === "on";
        note(`tablet: ${merchant.name} ${status}${soft ? " (soft, until midnight)" : ""} (webhook only, mock state unchanged)`);
        availabilityWebhook(merchant, {
          status,
          ...(soft ? { name: "DELIVERY", end_time: iso(status === "OFFLINE" ? nextMidnight(merchant.address.time_zone) : new Date()) } : {}),
          ...(status === "OFFLINE" ? { reason: soft ? "Closed for the rest of today from the tablet." : "Paused on the tablet" } : {}),
        });
      }
      break;
    case "/_mock/escalate":
      if (merchant) {
        merchant.escalated = !merchant.escalated;
        note(`${merchant.name}: escalated ${merchant.escalated ? "on (PUT pos-status ONLINE answers 409)" : "off"}`);
      }
      break;
    case "/_mock/activate":
      activationWebhook(randomUUID());
      note("activation webhook fired, all merchants live");
      break;
    case "/_mock/config":
      sendWebhook("merchant_config", { merchant_ids: merchants.map((mm) => mm.merchant_id) }, "merchant configuration");
      break;
    case "/_mock/resend": {
      const d = deliveries.find((x) => x.id === form.get("delivery"));
      if (d) sendWebhook(d.kind, JSON.parse(d.body), `${d.summary} (resend)`);
      break;
    }
    case "/_mock/pause-deliveries":
      deliveriesPaused = !deliveriesPaused;
      note(deliveriesPaused ? "webhook deliveries paused (queue holds)" : "webhook deliveries resumed");
      break;
    case "/_mock/stale-timer":
      staleTimerOn = !staleTimerOn;
      note(`auto-stale timer ${staleTimerOn ? "on" : "off"}`);
      break;
    case "/_mock/reconcile": {
      if (!INTERNAL_API_SECRET) {
        note("reconcile: INTERNAL_API_SECRET missing in apps/api/.env");
        break;
      }
      try {
        const r2 = await fetch(`${API_URL}/api/cron/uber-eats`, { headers: { Authorization: `Bearer ${INTERNAL_API_SECRET}` } });
        note(`reconcile -> ${r2.status} ${await r2.text()}`);
      } catch (error) {
        note(`reconcile -> unreachable (${(error as Error).message})`);
      }
      break;
    }
    case "/_mock/reset":
      orders.clear();
      changeRequests.length = 0;
      menuJobs.clear();
      deliveries.length = 0;
      for (const mm of merchants) {
        mm.posStatus = "ONLINE";
        mm.closedToday = false;
        mm.integrationLive = false;
        mm.escalated = false;
      }
      deliveriesPaused = false;
      staleTimerOn = true;
      note("reset: merchants fresh, orders and deliveries cleared");
      break;
    default:
      return fail(res, 404, "Unknown control action.");
  }
  return redirect(res, "/");
};

// ─── Control panel HTML ──────────────────────────────────────────

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const page = (title: string, body: string) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} · Grubhub mock</title>
<style>
body{font:14px/1.45 ui-sans-serif,system-ui,sans-serif;margin:0;background:#f6f6f6;color:#111}
main{max-width:1080px;margin:0 auto;padding:28px 20px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px}
.dim{color:#666}.card{background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:14px 16px;margin:10px 0}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
button{height:30px;padding:0 10px;border:1px solid #cfcfcf;border-radius:6px;background:#fff;cursor:pointer;font:inherit;font-size:13px}
button.primary{background:#000;color:#fff;border-color:#000}button.orange{background:#ff8000;border-color:#ff8000;color:#fff}
form.inline{display:inline-flex;gap:6px;align-items:center}select{height:30px;font:inherit}label.chk{font-size:13px;display:inline-flex;gap:4px;align-items:center}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top}
.tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:12px;background:#eee}.tag.on{background:#e6f4ec;color:#1e7a45}.tag.off{background:#fceded;color:#a12c2c}.tag.warn{background:#fff4e0;color:#8a5200}
pre{font-size:12px;white-space:pre-wrap;margin:0}code{font-size:12px}
.badge{font-size:11px;background:#000;color:#fff;border-radius:4px;padding:1px 6px;margin-left:6px}
</style></head><body><main><h1>${esc(title)}<span class="badge">mock</span></h1>${body}</main></body></html>`;

const btn = (action: string, label: string, fields: Record<string, string>, cls = "") =>
  `<form class="inline" method="post" action="/_mock/${action}">${Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join("")}<button class="${cls}">${esc(label)}</button></form>`;

const KIND_LABEL: Record<OrderKind, string> = { pickup: "pickup", managed: "Grubhub delivery", self: "self delivery" };
const CLOSED: OrderStatus[] = ["FULFILLED", "CANCELLED", "REJECTED", "STALE"];

const dashboard = () => {
  const merchantCards = merchants
    .map(
      (mm) => `<div class="card">
        <div class="row" style="justify-content:space-between;margin:0">
          <div><b>${esc(mm.name)}</b> <span class="dim">· ${esc(mm.address.street_address)}, ${esc(mm.address.locality)} ${esc(mm.address.region)}</span><br>
          <code class="dim">merchant_id ${mm.merchant_id}</code></div>
          <div>
            <span class="tag ${mm.posStatus === "ONLINE" ? "on" : "off"}">POS ${mm.posStatus}</span>
            <span class="tag ${mm.closedToday ? "off" : ""}">${mm.closedToday ? "closed for today" : "open today"}</span>
            <span class="tag ${mm.integrationLive ? "on" : "warn"}">${mm.integrationLive ? "integration live" : "integration pending"}</span>
            ${mm.escalated ? `<span class="tag off">escalated</span>` : ""}
          </div>
        </div>
        <div class="row">
          <form class="inline" method="post" action="/_mock/order"><input type="hidden" name="merchant" value="${mm.merchant_id}">
            <select name="kind"><option value="pickup">Pickup</option><option value="managed">Grubhub delivery</option><option value="self">Self delivery</option></select>
            <label class="chk"><input type="checkbox" name="future"> future (+2 h)</label>
            <label class="chk"><input type="checkbox" name="test"> test</label>
            <button class="orange">New order</button></form>
        </div>
        <div class="row">
          <form class="inline" method="post" action="/_mock/availability"><input type="hidden" name="merchant" value="${mm.merchant_id}">
            <span class="dim">Tablet:</span>
            <select name="status"><option value="OFFLINE">OFFLINE</option><option value="ONLINE">ONLINE</option></select>
            <label class="chk"><input type="checkbox" name="soft" checked> soft (with end_time)</label>
            <button>Send availability webhook</button></form>
          ${btn("escalate", mm.escalated ? "Clear escalation" : "Escalate (409 on resume)", { merchant: mm.merchant_id })}
        </div>
      </div>`
    )
    .join("");

  const orderRows = [...orders.values()]
    .sort((a, b) => b.time_placed.localeCompare(a.time_placed))
    .slice(0, 40)
    .map((o) => {
      const mm = merchantOf(o);
      const kind = orderKind(o);
      const lines = o.charges.line_groups[0]!.lines;
      const actions = [
        kind === "managed" && (o.status === "CONFIRMED" || o.status === "PICKUP_READY") ? btn("advance", "Driver picked up", { uuid: o.uuid }) : "",
        kind === "managed" && o.status === "OUT_FOR_DELIVERY" ? btn("advance", "Driver delivered", { uuid: o.uuid }) : "",
        !CLOSED.includes(o.status) ? btn("fulfill", "Fulfill", { uuid: o.uuid }) : "",
        !CLOSED.includes(o.status) ? btn("diner-cancel", "Diner cancels", { uuid: o.uuid }) : "",
        o.status === "RESTAURANT_CONFIRMABLE" ? btn("stale", "Go stale now", { uuid: o.uuid }) : "",
      ].join("");
      return `<tr><td><code>${esc(o.uuid.slice(0, 8))}</code>${o.is_test ? ` <span class="tag">test</span>` : ""}</td>
        <td><b>${esc(o.order_number.slice(-6))}</b><br><span class="dim">${esc(o.diners[0]!.diner_info.name)}</span></td>
        <td>${esc(mm?.name ?? o.merchant_id)}</td>
        <td>${KIND_LABEL[kind]}${o.fulfillment_scheduling === "FUTURE" ? `<br><span class="tag">future</span>` : ""}<br><span class="dim">${lines.map((l) => `${l.quantity}x ${esc(l.name)}`).join(", ")}</span></td>
        <td><span class="tag ${o.status === "RESTAURANT_CONFIRMABLE" ? "warn" : CLOSED.includes(o.status) && o.status !== "FULFILLED" ? "off" : ""}">${o.status}</span>${o.external_order_id ? `<br><span class="dim">ext ${esc(o.external_order_id)}</span>` : ""}</td>
        <td><span class="dim">${o.time_placed.slice(11, 19)}Z</span><br><span class="dim">$${(o.charges.merchant_total / 100).toFixed(2)}</span></td>
        <td class="row" style="margin:0">${actions}</td></tr>`;
    })
    .join("");

  const changeRows = changeRequests
    .slice(0, 20)
    .map((c) => {
      const target = orders.get(c.order_id);
      return `<tr><td><b>${esc(target?.order_number.slice(-6) ?? c.order_id)}</b></td><td>${esc(c.requested_action)}</td>
        <td><span class="dim">${esc(String(c.request.reason ?? ""))}</span></td>
        <td><span class="tag ${c.status === "APPROVED" ? "on" : c.status === "DENIED" ? "off" : "warn"}">${c.status}</span></td>
        <td class="row" style="margin:0">${c.status === "PENDING" ? btn("approve-cancel", "Care approves", { id: c.change_request_id }) + btn("deny-cancel", "Care denies", { id: c.change_request_id }) : ""}</td></tr>`;
    })
    .join("");

  const deliveryRows = deliveries
    .slice(0, 25)
    .map((d) => {
      const tone = d.lastStatus.startsWith("2") ? "on" : d.done ? "off" : "warn";
      const next = d.done ? "" : d.inflight ? "sending" : deliveriesPaused ? "held" : `next in ${Math.max(0, Math.round((d.nextAt - Date.now()) / 1000))} s`;
      return `<tr><td>${esc(d.kind)}</td><td>${esc(d.summary)}</td><td><span class="tag ${tone}">${esc(d.lastStatus)}</span> <span class="dim">x ${d.attempts}${next ? ` · ${next}` : ""}</span></td><td>${btn("resend", "Resend", { delivery: d.id })}</td></tr>`;
    })
    .join("");

  return page(
    "Grubhub stand-in",
    `<p class="dim">Pretends to be <code>api-third-party-gtm-pp.grubhub.com</code> on <code>${SELF}</code>. Webhooks go to <code>${esc(WEBHOOK_URL)}</code> with Basic auth <code>${esc(WEBHOOK_USER)}:***</code>.</p>
     <div class="row">
       ${btn("reconcile", "Run hub reconcile cron now", {}, "primary")}
       ${btn("activate", "Fire activation webhook (go live)", {})}
       ${btn("config", "Fire merchant configuration webhook", {})}
       ${btn("pause-deliveries", deliveriesPaused ? "Resume webhook deliveries" : "Pause webhook deliveries", {}, deliveriesPaused ? "orange" : "")}
       ${btn("stale-timer", staleTimerOn ? "Auto-stale: on (turn off)" : "Auto-stale: off (turn on)", {})}
       ${btn("reset", "Reset everything", {})}
       <button onclick="location.reload()">Refresh</button>
     </div>
     <h2>Merchants</h2>${merchantCards}
     <h2>Orders</h2><div class="card">${orderRows ? `<table><tr><th>uuid</th><th>#</th><th>Merchant</th><th>Kind · lines</th><th>Status</th><th>Placed · merchant total</th><th></th></tr>${orderRows}</table>` : `<p class="dim" style="margin:0">No orders yet. Press <b>New order</b> on a merchant.</p>`}</div>
     <h2>Change requests</h2><div class="card">${changeRows ? `<table><tr><th>Order</th><th>Action</th><th>Reason</th><th>Status</th><th></th></tr>${changeRows}</table>` : `<p class="dim" style="margin:0">None. The hub's "Ask Grubhub to cancel" on a confirmed order lands here.</p>`}</div>
     <h2>Webhook deliveries${deliveriesPaused ? ` <span class="tag off">paused</span>` : ""}</h2><div class="card">${deliveryRows ? `<table><tr><th>Kind</th><th>What</th><th>Last answer</th><th></th></tr>${deliveryRows}</table>` : `<p class="dim" style="margin:0">None yet.</p>`}</div>
     <h2>Log</h2><div class="card"><pre>${log.slice(0, 60).map((l) => `${l.at}  ${esc(l.line)}`).join("\n") || "quiet"}</pre></div>
     <h2>Config</h2><div class="card"><pre>${esc(`# apps/api/.env
GRUBHUB_API_URL=${SELF}
GRUBHUB_PARTNER_KEY=${PARTNER_KEY}
GRUBHUB_CLIENT_ID=${CLIENT_ID}
GRUBHUB_CLIENT_SECRET=${CLIENT_SECRET}
GRUBHUB_ISSUE_DATE=2024-01-01
GRUBHUB_WEBHOOK_USER=${WEBHOOK_USER}
GRUBHUB_WEBHOOK_PASSWORD=${WEBHOOK_PASSWORD}

webhook url: ${WEBHOOK_URL}
hub api:     ${API_URL}`)}</pre></div>
     <h2>How to test the hub</h2><div class="card"><ol style="margin:0;padding-left:18px">
       <li>Paste the config block above into apps/api/.env and restart the api.</li>
       <li>In the hub, add the Grubhub app to a project and connect merchant <code>1234567</code> (Tony's) or <code>7654321</code> (Pho House).</li>
       <li>Press <b>Fire activation webhook</b> (or call partner/activate from the hub) so the store shows live.</li>
       <li><b>New order</b> here; the hub gets the order webhook. Confirm / Reject / Ready from the hub come back as PUT status and show in the Log.</li>
       <li>Leave a new order alone for 8 minutes (or <b>Go stale now</b>): STALE, then CANCELLED 10 s later, both by webhook.</li>
       <li>Pause from the hub (hard = PUT pos-status, soft = closenow) and watch the merchant badges. <b>Send availability webhook</b> goes the other way, like a tablet pause.</li>
       <li><b>Pause webhook deliveries</b>, place orders, then <b>Run hub reconcile cron now</b> to see the hub catch up by polling.</li>
     </ol></div>`
  );
};

// ─── Boot ────────────────────────────────────────────────────────

createServer(async (rawReq, res) => {
  const req = rawReq as Req;
  req.body = await readBody(rawReq);
  const apiCall = req.url.startsWith("/pos/") || req.url.startsWith("/merchant/");
  try {
    await route(req, res);
  } catch (error) {
    console.error("[grubhub-mock] route crashed", error);
    if (!res.headersSent) fail(res, 500, "Mock crashed; see its terminal.");
  }
  if (apiCall) note(`${req.method} ${req.url} -> ${res.statusCode}`);
}).listen(PORT, () => {
  console.log(`Grubhub stand-in on ${SELF}`);
  console.log(`  partner key    ${PARTNER_KEY}${PARTNER_KEY === "mock-partner" ? "  (no GRUBHUB_PARTNER_KEY in apps/api/.env, using a placeholder)" : ""}`);
  console.log(`  client id      ${CLIENT_ID}`);
  console.log(`  webhooks ->    ${WEBHOOK_URL}  (Basic ${WEBHOOK_USER}:***)`);
  console.log(`  hub api        ${API_URL}`);
  console.log(`  set in apps/api/.env: GRUBHUB_API_URL=${SELF}  (open ${SELF} for the full block)`);
});
