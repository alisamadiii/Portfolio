/* eslint-disable no-console */
// ─── Stand-in Uber Eats Marketplace API for local testing ────────
// Mirrors the real endpoints, auth rules, payloads and webhooks the hub's
// Uber Eats app talks to, so the whole flow (connect → pick store → pause /
// resume → orders arriving by webhook → hourly reconcile) runs on a laptop
// without a real restaurant. Shapes follow developer.uber.com/docs/eats:
//
//   POST /oauth/v2/token                         client_credentials | authorization_code
//   GET  /oauth/v2/authorize                      consent page (Allow / Deny), ?code&state back
//   GET  /v1/eats/stores                          merchant token → their stores; app token → provisioned stores
//   GET  /v1/eats/stores/{id}                     store details
//   GET|POST /v1/eats/store/{id}/status           ONLINE | PAUSED (+ paused_until, reason)
//   POST|GET|PATCH|DELETE /v1/eats/stores/{id}/pos_data
//   GET  /v2/eats/order/{id}                      full v2 order
//   GET  /v1/eats/stores/{id}/created-orders | canceled-orders
//   POST /v1/eats/orders/{id}/accept_pos_order | deny_pos_order | cancel
//   webhooks: orders.notification, orders.cancel, orders.release,
//             store.provisioned, store.deprovisioned, store.menu_refresh_request
//             (X-Uber-Signature = hex HMAC-SHA256(body, client secret); retries
//             10s, 30s, 60s, 120s… up to 7 sends when you don't answer 200)
//
// Not Uber (the control panel): GET / and POST /_mock/* create orders, move
// them along, cancel, deprovision, ask for a menu refresh, trigger the hub's
// reconcile cron. State lives in memory; restart = fresh.
//
// Run:  pnpm uber:mock            (reads apps/api/.env for the client id/secret)
// Then in apps/api/.env:  UBER_EATS_AUTH_URL=http://localhost:4010
//                         UBER_EATS_API_URL=http://localhost:4010
// Uber dashboard redirect URI stays <NEXT_PUBLIC_API_URL>/api/uber-eats/callback.

import { createHmac, randomBytes, randomUUID } from "node:crypto";
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

const PORT = Number(env("UBER_MOCK_PORT", "4010"));
const CLIENT_ID = env("UBER_EATS_CLIENT_ID", "mock-client-id");
const CLIENT_SECRET = env("UBER_EATS_CLIENT_SECRET", "mock-client-secret");
const API_URL = env("NEXT_PUBLIC_API_URL", "http://localhost:3000").replace(/\/$/, "");
const WEBHOOK_URL = env("UBER_MOCK_WEBHOOK_URL", `${API_URL}/api/webhook/uber-eats`);
const INTERNAL_API_SECRET = env("INTERNAL_API_SECRET");
const SELF = `http://localhost:${PORT}`;
const TOKEN_TTL = 2_592_000; // 30 days, like Uber

// ─── Data ────────────────────────────────────────────────────────

type Money = { amount: number; currency_code: string; formatted_amount: string };
type StoreStatus = "ONLINE" | "PAUSED";
type OrderState = "CREATED" | "ACCEPTED" | "DENIED" | "FINISHED" | "CANCELED";
type OrderType = "PICK_UP" | "DINE_IN" | "DELIVERY_BY_UBER" | "DELIVERY_BY_RESTAURANT";

type ModifierOption = { id: string; title: string; price: number };
type ModifierGroup = { id: string; title: string; options: ModifierOption[]; pick: 1 | 2 };
type MenuItem = { id: string; title: string; price: number; external_data: string; modifiers?: ModifierGroup[] };

type Store = {
  store_id: string;
  merchantId: string;
  name: string;
  location: {
    address: string;
    address_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  contact_emails: string[];
  raw_hero_url: string;
  price_bucket: "$" | "$$" | "$$$" | "$$$$";
  avg_prep_time: number;
  status: "active" | "pending_review" | "deleted" | "rejected";
  merchant_store_id: string;
  timezone: string;
  web_url: string;
  menu: MenuItem[];
  // Set when an app activates the integration (POST pos_data).
  pos_data: null | {
    client_id: string;
    integration_enabled: boolean;
    is_order_manager: boolean;
    integrator_store_id: string | null;
    integrator_brand_id: string | null;
    store_configuration_data: string | null;
    is_order_manager_pending: boolean;
  };
  online: { status: StoreStatus; paused_until: string | null; offline_reason: string | null };
};

type Merchant = { id: string; label: string; user: { first_name: string; last_name: string; email: string } };

type Order = {
  id: string;
  storeId: string;
  display_id: string;
  current_state: OrderState;
  type: OrderType;
  placed_at: string;
  estimated_ready_for_pickup_at: string;
  eater: { first_name: string; last_name: string; phone: string; phone_code: string };
  items: Array<{
    id: string;
    instance_id: string;
    title: string;
    external_data: string;
    quantity: number;
    /** Base price, before options. */
    unit_price: number;
    special_instructions?: string;
    modifiers: Array<{ group: ModifierGroup; option: ModifierOption }>;
  }>;
  special_instructions: string;
  currency: string;
  /** Merchant-funded promo on the subtotal, in cents (0 = none). */
  merchant_promo: number;
  courier: null | {
    id: string;
    first_name: string;
    picture_url: string;
    vehicle: { make: string; model: string; color: string; license_plate: string; is_autonomous: boolean };
    phone: string;
    phone_code: string;
    current_state: "EN_ROUTE_TO_PICKUP" | "ARRIVED_AT_PICKUP" | "EN_ROUTE_TO_DROPOFF" | "COMPLETED";
    estimated_pickup_time: string;
  };
  deny_reason?: { type: string; info: string };
  cancel_reason?: string;
};

type Token = { kind: "app" | "merchant"; scopes: string[]; merchantId?: string; exp: number };

type AuthCode = { merchantId: string; redirect_uri: string; exp: number };

const merchants: Merchant[] = [
  { id: "m-single", label: "Tony's Pizza Kitchen (one store)", user: { first_name: "Tony", last_name: "Russo", email: "tony@tonyspizzakitchen.test" } },
  { id: "m-multi", label: "Bunny's Burgers (two stores)", user: { first_name: "Dana", last_name: "Hart", email: "dana@bunnysburgers.test" } },
];

const PIZZA_MODS: ModifierGroup[] = [
  { id: "mg-size", title: "Size", pick: 1, options: [{ id: "mo-12", title: "12\"", price: 0 }, { id: "mo-14", title: "14\"", price: 200 }, { id: "mo-16", title: "16\"", price: 500 }] },
  { id: "mg-top", title: "Extra toppings", pick: 2, options: [{ id: "mo-mush", title: "Mushrooms", price: 150 }, { id: "mo-olive", title: "Black olives", price: 150 }, { id: "mo-xcheese", title: "Extra cheese", price: 250 }] },
];
const BURGER_MODS: ModifierGroup[] = [
  { id: "mg-done", title: "Doneness", pick: 1, options: [{ id: "mo-med", title: "Medium", price: 0 }, { id: "mo-well", title: "Well done", price: 0 }] },
  { id: "mg-add", title: "Add-ons", pick: 2, options: [{ id: "mo-bacon", title: "Bacon", price: 200 }, { id: "mo-egg", title: "Fried egg", price: 150 }, { id: "mo-avo", title: "Avocado", price: 175 }] },
];
const PIZZA: MenuItem[] = [
  { id: "it-margherita", title: "Margherita Pizza", price: 1699, external_data: "PZ-001", modifiers: PIZZA_MODS },
  { id: "it-pepperoni", title: "Pepperoni Pizza", price: 1899, external_data: "PZ-002", modifiers: PIZZA_MODS },
  { id: "it-garlic", title: "Garlic Knots (6)", price: 699, external_data: "SD-004" },
  { id: "it-caesar", title: "Caesar Salad", price: 999, external_data: "SL-002" },
  { id: "it-soda", title: "Coca-Cola (20 oz)", price: 299, external_data: "BV-010" },
  { id: "it-tiramisu", title: "Tiramisu", price: 799, external_data: "DS-001" },
];
const BURGERS: MenuItem[] = [
  { id: "it-classic", title: "Classic Smash Burger", price: 1199, external_data: "BG-001", modifiers: BURGER_MODS },
  { id: "it-double", title: "Double Smash Burger", price: 1499, external_data: "BG-002", modifiers: BURGER_MODS },
  { id: "it-chkn", title: "Crispy Chicken Sandwich", price: 1299, external_data: "BG-010" },
  { id: "it-fries", title: "Seasoned Fries", price: 499, external_data: "SD-001" },
  { id: "it-shake", title: "Vanilla Shake", price: 649, external_data: "BV-003" },
  { id: "it-rings", title: "Onion Rings", price: 549, external_data: "SD-002" },
];

const mkStore = (s: Omit<Store, "pos_data" | "online" | "contact_emails" | "raw_hero_url" | "status" | "price_bucket" | "avg_prep_time" | "web_url"> & Partial<Store>): Store => ({
  contact_emails: [`owner@${s.name.toLowerCase().replace(/[^a-z]+/g, "")}.test`],
  raw_hero_url: "https://tb-static.uber.com/prod/image-proc/processed_images/mock-hero/4218ca1d09174218364162cd4b1a9cfb.jpeg",
  price_bucket: "$$",
  avg_prep_time: 20,
  status: "active",
  web_url: `https://www.ubereats.com/store/${s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${s.store_id}`,
  pos_data: null,
  online: { status: "ONLINE", paused_until: null, offline_reason: null },
  ...s,
});

const stores: Store[] = [
  mkStore({
    store_id: "5a1d0f3c-2b1e-4e8a-9f3d-0c1b2a3d4e5f",
    merchantId: "m-single",
    name: "Tony's Pizza Kitchen",
    location: { address: "1201 N Franklin St", city: "Tampa", state: "FL", postal_code: "33602", country: "US", latitude: 27.9538, longitude: -82.4596 },
    merchant_store_id: "TPK-TAMPA-01",
    timezone: "America/New_York",
    menu: PIZZA,
  }),
  mkStore({
    store_id: "8c2e4b61-7d93-4f0a-b5c6-1e2f3a4b5c6d",
    merchantId: "m-multi",
    name: "Bunny's Burgers - Riverside",
    location: { address: "2715 Park St", city: "Jacksonville", state: "FL", postal_code: "32205", country: "US", latitude: 30.3119, longitude: -81.6883 },
    merchant_store_id: "BB-RIV",
    timezone: "America/New_York",
    menu: BURGERS,
  }),
  mkStore({
    store_id: "e4f5a6b7-c8d9-4e0f-a1b2-c3d4e5f6a7b8",
    merchantId: "m-multi",
    name: "Bunny's Burgers - San Marco",
    location: { address: "1974 San Marco Blvd", address_2: "Suite B", city: "Jacksonville", state: "FL", postal_code: "32207", country: "US", latitude: 30.3064, longitude: -81.6565 },
    merchant_store_id: "BB-SM",
    timezone: "America/New_York",
    menu: BURGERS,
  }),
];

const orders = new Map<string, Order>();
const tokens = new Map<string, Token>();
const codes = new Map<string, AuthCode>();
const log: Array<{ at: string; line: string }> = [];
const note = (line: string) => {
  const at = new Date().toISOString().slice(11, 19);
  log.unshift({ at, line });
  if (log.length > 200) log.pop();
  console.log(`[uber-mock ${at}] ${line}`);
};

const EATERS = [
  ["Sam", "Ortiz"], ["Priya", "Natarajan"], ["Marcus", "Bell"], ["Elena", "Petrova"], ["Jordan", "Lee"],
  ["Aisha", "Rahman"], ["Noah", "Fischer"], ["Camila", "Reyes"], ["Theo", "Okafor"], ["Grace", "Kim"],
] as const;
const INSTRUCTIONS = ["", "", "Extra napkins please", "Ring the bell, baby sleeping", "No onions", "Leave at the door"];
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]!;

const money = (amount: number, currency = "USD"): Money => ({
  amount,
  currency_code: currency,
  formatted_amount: new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100),
});

const createOrder = (store: Store, opts: { type?: OrderType } = {}): Order => {
  const id = randomUUID();
  const count = 1 + Math.floor(Math.random() * 3);
  const chosen = [...store.menu].sort(() => Math.random() - 0.5).slice(0, count);
  const [first, last] = pick(EATERS);
  const placed = new Date();
  const order: Order = {
    id,
    storeId: store.store_id,
    display_id: id.slice(-5).toUpperCase(),
    current_state: "CREATED",
    type: opts.type ?? pick(["DELIVERY_BY_UBER", "DELIVERY_BY_UBER", "PICK_UP"] as const),
    placed_at: placed.toISOString(),
    estimated_ready_for_pickup_at: new Date(placed.getTime() + store.avg_prep_time * 60_000).toISOString(),
    eater: { first_name: first, last_name: last, phone: "+18135550" + String(100 + Math.floor(Math.random() * 900)), phone_code: String(1000 + Math.floor(Math.random() * 9000)) },
    items: chosen.map((m) => ({
      id: m.id,
      instance_id: randomUUID(),
      title: m.title,
      external_data: m.external_data,
      quantity: 1 + Math.floor(Math.random() * 2),
      unit_price: m.price,
      ...(Math.random() < 0.3 ? { special_instructions: pick(["No ice", "Extra sauce on the side", "Cut in squares", "Light salt"]) } : {}),
      modifiers: (m.modifiers ?? []).flatMap((group) => {
        const picked = [...group.options].sort(() => Math.random() - 0.5).slice(0, group.pick === 1 ? 1 : Math.floor(Math.random() * 3));
        return picked.map((option) => ({ group, option }));
      }),
    })),
    special_instructions: pick(INSTRUCTIONS),
    currency: "USD",
    merchant_promo: 0,
    courier: null,
  };
  // A quarter of orders carry a 10% promo the restaurant pays for.
  if (Math.random() < 0.25) order.merchant_promo = Math.round(lineSubtotal(order) * 0.1);
  orders.set(id, order);
  return order;
};

const itemUnitPrice = (i: Order["items"][number]) => i.unit_price + i.modifiers.reduce((n, m) => n + m.option.price, 0);
const lineSubtotal = (o: Order) => o.items.reduce((n, i) => n + itemUnitPrice(i) * i.quantity, 0);

const COURIERS = [
  { first_name: "Chris", vehicle: { make: "Toyota", model: "Prius", color: "Silver" } },
  { first_name: "Maya", vehicle: { make: "Honda", model: "Civic", color: "Blue" } },
  { first_name: "Luis", vehicle: { make: "Nissan", model: "Sentra", color: "Black" } },
  { first_name: "Jen", vehicle: { make: "Hyundai", model: "Elantra", color: "White" } },
] as const;

/** Uber assigns a courier once the restaurant accepts a delivery order. */
const assignCourier = (o: Order) => {
  if (o.type !== "DELIVERY_BY_UBER" || o.courier) return;
  const c = pick(COURIERS);
  const n = Math.floor(Math.random() * 70);
  o.courier = {
    id: randomUUID(),
    first_name: c.first_name,
    picture_url: `https://i.pravatar.cc/150?img=${n}`,
    vehicle: { ...c.vehicle, license_plate: `${pick(["ABC", "KXZ", "QRT", "MNP"])}${1000 + Math.floor(Math.random() * 9000)}`, is_autonomous: false },
    phone: "+18135550" + String(100 + Math.floor(Math.random() * 900)),
    phone_code: String(1000 + Math.floor(Math.random() * 9000)),
    current_state: "EN_ROUTE_TO_PICKUP",
    estimated_pickup_time: new Date(Date.now() + 12 * 60_000).toISOString(),
  };
};

/** Full GET /v2/eats/order/{id} body, as documented. */
const orderV2 = (o: Order) => {
  const store = stores.find((s) => s.store_id === o.storeId)!;
  const sub = lineSubtotal(o);
  const subAfterPromo = sub - o.merchant_promo;
  const tax = Math.round(subAfterPromo * 0.07);
  const delivery = o.type === "DELIVERY_BY_UBER" ? 299 : 0;
  // Uber's docs: tip and the marketplace fee only on orders the restaurant delivers itself.
  const tip = o.type === "DELIVERY_BY_RESTAURANT" ? Math.round(sub * 0.15) : 0;
  const marketplaceFee = o.type === "DELIVERY_BY_RESTAURANT" ? Math.round(sub * 0.05) : 0;
  const serviceFee = o.type === "DELIVERY_BY_RESTAURANT" ? 199 : 0;
  const total = subAfterPromo + tax + serviceFee + tip;
  const m = (amount: number) => money(amount, o.currency);
  const modifierItem = (mod: Order["items"][number]["modifiers"][number]) => ({
    id: mod.option.id,
    instance_id: randomUUID(),
    title: mod.option.title,
    external_data: mod.option.id.toUpperCase(),
    quantity: 1,
    price: { unit_price: m(mod.option.price), total_price: m(mod.option.price), base_unit_price: m(mod.option.price), base_total_price: m(mod.option.price) },
    selected_modifier_groups: [],
  });
  return {
    id: o.id,
    display_id: o.display_id,
    external_reference_id: "",
    current_state: o.current_state,
    type: o.type,
    brand: "UBER_EATS",
    store: {
      id: store.store_id,
      name: store.name,
      external_reference_id: store.merchant_store_id,
      integrator_store_id: store.pos_data?.integrator_store_id ?? "",
      integrator_brand_id: store.pos_data?.integrator_brand_id ?? "",
      merchant_store_id: store.merchant_store_id,
      timezone: store.timezone,
      contact_emails: store.contact_emails,
      raw_hero_url: store.raw_hero_url,
      price_bucket: store.price_bucket,
      avg_prep_time: store.avg_prep_time,
      status: store.status,
      web_url: store.web_url,
      location: store.location,
    },
    eater: o.eater,
    eaters: [{ id: randomUUID(), first_name: o.eater.first_name }],
    cart: {
      items: o.items.map((i) => {
        const unit = itemUnitPrice(i);
        const groups = [...new Set(i.modifiers.map((x) => x.group.id))].map((gid) => {
          const group = i.modifiers.find((x) => x.group.id === gid)!.group;
          return {
            id: group.id,
            title: group.title,
            external_data: group.id.toUpperCase(),
            selected_items: i.modifiers.filter((x) => x.group.id === gid).map(modifierItem),
            removed_items: [],
          };
        });
        return {
          id: i.id,
          instance_id: i.instance_id,
          title: i.title,
          external_data: i.external_data,
          quantity: i.quantity,
          price: {
            unit_price: m(unit),
            total_price: m(unit * i.quantity),
            base_unit_price: m(i.unit_price),
            base_total_price: m(i.unit_price * i.quantity),
          },
          selected_modifier_groups: groups,
          ...(i.special_instructions ? { special_instructions: i.special_instructions } : {}),
          fulfillment_action: { fulfillment_action_type: "REPLACE_FOR_ME", item_substitutes: [] },
        };
      }),
      special_instructions: o.special_instructions,
      fulfillment_issues: [],
    },
    payment: {
      charges: {
        total: m(total),
        sub_total: m(sub),
        tax: m(tax),
        total_fee: m(serviceFee),
        total_fee_tax: m(Math.round(serviceFee * 0.07)),
        bag_fee: m(0),
        total_promo_applied: m(total),
        sub_total_promo_applied: m(subAfterPromo),
        tax_promo_applied: m(tax),
        pick_and_pack_fee: m(0),
        delivery_fee: m(delivery),
        delivery_fee_tax: m(Math.round(delivery * 0.07)),
        small_order_fee: m(0),
        small_order_fee_tax: m(0),
        tip: m(tip),
        cash_amount_due: m(0),
        ...(marketplaceFee ? { marketplace_fee_due_to_uber: m(marketplaceFee) } : {}),
      },
      accounting: {
        // Florida: the restaurant remits sales tax on its food; Uber remits tax on its own fees.
        tax_remittance: {
          tax: {
            uber: delivery ? [{ title: "Delivery fee tax", tax_remittance: "UBER", tax_amount: m(Math.round(delivery * 0.07)) }] : [],
            restaurant: [{ title: "FL sales tax", tax_remittance: "MERCHANT", tax_amount: m(tax) }],
          },
        },
        tax_reporting: { breakdown: { items: {}, fees: {} }, origin: { country: "US" } },
      },
      promotions: {
        promotions: o.merchant_promo
          ? [
              {
                promo_type: "PERCENTOFF",
                promo_discount_value: o.merchant_promo,
                promo_discount_percentage: 10,
                promo_funding_splits: [{ funding_source: "organization", amount: m(o.merchant_promo) }],
              },
            ]
          : [],
      },
    },
    packaging: { disposable_items: { should_include: false } },
    placed_at: o.placed_at,
    estimated_ready_for_pickup_at: o.estimated_ready_for_pickup_at,
    deliveries: o.courier ? [o.courier] : [],
    order_manager_client_id: store.pos_data?.is_order_manager ? store.pos_data.client_id : "",
    ...(o.deny_reason ? { deny_reason: o.deny_reason } : {}),
    ...(o.cancel_reason ? { cancel_reason: o.cancel_reason } : {}),
  };
};

/** GET /v1/eats/stores/{id} body, as documented. */
const storeV1 = (s: Store) => ({
  name: s.name,
  store_id: s.store_id,
  location: s.location,
  contact_emails: s.contact_emails,
  raw_hero_url: s.raw_hero_url,
  price_bucket: s.price_bucket,
  avg_prep_time: s.avg_prep_time,
  status: s.status,
  merchant_store_id: s.merchant_store_id,
  timezone: s.timezone,
  web_url: s.web_url,
  pos_data: s.pos_data
    ? {
        integration_enabled: s.pos_data.integration_enabled,
        order_manager_client_id: s.pos_data.is_order_manager ? s.pos_data.client_id : "",
        integrator_store_id: s.pos_data.integrator_store_id,
        integrator_brand_id: s.pos_data.integrator_brand_id,
        store_configuration_data: s.pos_data.store_configuration_data,
        is_order_manager_pending: s.pos_data.is_order_manager_pending,
      }
    : { integration_enabled: false, order_manager_client_id: "", is_order_manager_pending: false },
});

const provisionedToApp = (s: Store) => s.pos_data?.client_id === CLIENT_ID && s.pos_data.integration_enabled;

// ─── Webhooks (signed, retried like Uber) ────────────────────────

type Delivery = { id: string; type: string; attempts: number; lastStatus: string; body: string };
const deliveries: Delivery[] = [];
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000, 120_000, 240_000, 480_000];

const sendWebhook = (eventType: string, meta: { user_id: string; resource_id: string; status?: string }, resourceHref?: string) => {
  const now = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    event_id: randomUUID(),
    event_time: now,
    event_type: eventType,
    meta: { resource_id: meta.resource_id, status: meta.status ?? "pos", user_id: meta.user_id },
    resource_href: resourceHref ?? `${SELF}/v1/eats/stores/${meta.user_id}`,
    webhook_meta: { client_id: CLIENT_ID, webhook_config_id: "mock-primary", webhook_msg_timestamp: now, webhook_msg_uuid: randomUUID() },
  });
  const delivery: Delivery = { id: randomUUID(), type: eventType, attempts: 0, lastStatus: "pending", body };
  deliveries.unshift(delivery);
  if (deliveries.length > 100) deliveries.pop();

  const attempt = async () => {
    delivery.attempts++;
    const signature = createHmac("sha256", CLIENT_SECRET).update(body).digest("hex");
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Uber-Signature": signature, "X-Environment": "sandbox" },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      delivery.lastStatus = String(res.status);
      note(`webhook ${eventType} → ${res.status} (attempt ${delivery.attempts})`);
      // Uber retries on 5xx/timeouts only; a 4xx is final.
      if (res.status < 500) return;
    } catch (error) {
      delivery.lastStatus = "unreachable";
      note(`webhook ${eventType} → unreachable (${(error as Error).message}, attempt ${delivery.attempts})`);
    }
    const delay = RETRY_DELAYS_MS[delivery.attempts - 1];
    if (delay == null) {
      note(`webhook ${eventType} gave up after ${delivery.attempts} sends`);
      return;
    }
    setTimeout(attempt, delay);
  };
  void attempt();
  return delivery;
};

const orderEvent = (type: string, o: Order) =>
  sendWebhook(type, { user_id: o.storeId, resource_id: o.id, status: "pos" }, `${SELF}/v2/eats/order/${o.id}`);

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
const fail = (res: ServerResponse, status: number, code: string, message: string) => json(res, status, { code, message });

const parseJson = (body: string) => {
  try {
    return body ? (JSON.parse(body) as Record<string, unknown>) : {};
  } catch {
    return null;
  }
};

const bearer = (req: IncomingMessage): Token | null => {
  const header = req.headers.authorization ?? "";
  const value = header.replace(/^Bearer\s+/i, "").trim();
  const token = tokens.get(value);
  if (!token || token.exp < Date.now()) return null;
  return token;
};

/** 401 without a token, 403 without the scope; mirrors Uber's answers. */
const authorize = (req: IncomingMessage, res: ServerResponse, scopes: string[]): Token | null => {
  const token = bearer(req);
  if (!token) {
    fail(res, 401, "unauthorized", "Invalid OAuth 2.0 credentials provided.");
    return null;
  }
  if (!scopes.some((s) => token.scopes.includes(s))) {
    fail(res, 403, "forbidden", `Requires one of the scopes: ${scopes.join(", ")}.`);
    return null;
  }
  return token;
};

const issueToken = (t: Omit<Token, "exp">) => {
  const value = randomBytes(32).toString("base64url");
  tokens.set(value, { ...t, exp: Date.now() + TOKEN_TTL * 1000 });
  return value;
};

const ISO_NO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

// ─── Routes ──────────────────────────────────────────────────────

const route = async (req: Req, res: ServerResponse) => {
  const url = new URL(req.url, SELF);
  const p = url.pathname;
  const m = (re: RegExp) => re.exec(p);

  // ── OAuth ──
  if (req.method === "POST" && p === "/oauth/v2/token") {
    const form = new URLSearchParams(req.body);
    if (form.get("client_id") !== CLIENT_ID || form.get("client_secret") !== CLIENT_SECRET) {
      return json(res, 401, { error: "invalid_client", error_description: "Client authentication failed." });
    }
    const grant = form.get("grant_type");
    if (grant === "client_credentials") {
      const scopes = (form.get("scope") ?? "").split(/\s+/).filter(Boolean);
      const known = ["eats.store", "eats.store.status.write", "eats.order", "eats.store.orders.read", "eats.report"];
      if (!scopes.length || scopes.some((s) => !known.includes(s))) {
        return json(res, 400, { error: "invalid_scope", error_description: `client_credentials allows: ${known.join(" ")}` });
      }
      const value = issueToken({ kind: "app", scopes });
      note(`token: client_credentials [${scopes.join(" ")}]`);
      return json(res, 200, { access_token: value, expires_in: TOKEN_TTL, token_type: "Bearer", scope: scopes.join(" "), refresh_token: "" });
    }
    if (grant === "authorization_code") {
      const code = codes.get(form.get("code") ?? "");
      if (!code || code.exp < Date.now()) return json(res, 400, { error: "invalid_grant", error_description: "Authorization code is invalid or expired." });
      if (code.redirect_uri !== form.get("redirect_uri")) return json(res, 400, { error: "invalid_grant", error_description: "redirect_uri mismatch." });
      codes.delete(form.get("code")!);
      const value = issueToken({ kind: "merchant", scopes: ["eats.pos_provisioning"], merchantId: code.merchantId });
      note(`token: authorization_code for merchant ${code.merchantId}`);
      return json(res, 200, { access_token: value, expires_in: TOKEN_TTL, token_type: "Bearer", scope: "eats.pos_provisioning", refresh_token: "" });
    }
    return json(res, 400, { error: "invalid_request", error_description: "Unsupported grant_type." });
  }

  if (req.method === "GET" && p === "/oauth/v2/authorize") {
    const q = url.searchParams;
    if (q.get("client_id") !== CLIENT_ID) return html(res, page("Unknown client", `<p>client_id doesn't match UBER_EATS_CLIENT_ID in apps/api/.env.</p>`), 400);
    if (q.get("response_type") !== "code") return html(res, page("Bad request", `<p>response_type must be <code>code</code>.</p>`), 400);
    if (!(q.get("scope") ?? "").split(/\s+/).includes("eats.pos_provisioning")) return html(res, page("Bad request", `<p>scope must include <code>eats.pos_provisioning</code>.</p>`), 400);
    const redirectUri = q.get("redirect_uri") ?? "";
    if (!redirectUri) return html(res, page("Bad request", `<p>redirect_uri is required.</p>`), 400);
    const state = q.get("state") ?? "";
    return html(
      res,
      page(
        "Sign in to Uber",
        `<p class="dim">Client Hub wants to: <b>view your stores and set up or remove POS integration</b> (eats.pos_provisioning).</p>
         <form method="post" action="/oauth/v2/authorize/decision">
           <input type="hidden" name="redirect_uri" value="${esc(redirectUri)}">
           <input type="hidden" name="state" value="${esc(state)}">
           <label>Sign in as<br><select name="merchant">${merchants.map((mm) => `<option value="${mm.id}">${esc(mm.label)} · ${esc(mm.user.email)}</option>`).join("")}</select></label>
           <div class="row"><button name="decision" value="allow" class="primary">Allow</button><button name="decision" value="deny">Deny</button></div>
         </form>`
      )
    );
  }

  if (req.method === "POST" && p === "/oauth/v2/authorize/decision") {
    const form = new URLSearchParams(req.body);
    const to = new URL(form.get("redirect_uri") ?? SELF);
    const state = form.get("state");
    if (state) to.searchParams.set("state", state);
    if (form.get("decision") !== "allow") {
      to.searchParams.set("error", "access_denied");
      note("authorize: merchant denied");
      return redirect(res, to.toString());
    }
    const merchantId = form.get("merchant") ?? merchants[0]!.id;
    const code = randomBytes(24).toString("base64url");
    codes.set(code, { merchantId, redirect_uri: form.get("redirect_uri") ?? "", exp: Date.now() + 5 * 60_000 });
    to.searchParams.set("code", code);
    note(`authorize: merchant ${merchantId} allowed`);
    return redirect(res, to.toString());
  }

  // ── Stores ──
  if (req.method === "GET" && p === "/v1/eats/stores") {
    const token = authorize(req, res, ["eats.store", "eats.pos_provisioning"]);
    if (!token) return;
    const visible = token.kind === "merchant" ? stores.filter((s) => s.merchantId === token.merchantId) : stores.filter(provisionedToApp);
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? 50), 50));
    const start = Number(url.searchParams.get("start_key") ?? 0) || 0;
    const slice = visible.slice(start, start + limit);
    return json(res, 200, { stores: slice.map(storeV1), next_key: start + limit < visible.length ? String(start + limit) : "" });
  }

  let r = m(/^\/v1\/eats\/stores\/([^/]+)$/);
  if (r && req.method === "GET") {
    const token = authorize(req, res, ["eats.store"]);
    if (!token) return;
    const store = stores.find((s) => s.store_id === r![1]);
    if (!store || !provisionedToApp(store)) return fail(res, 404, "not_found", "Store not found or not provisioned to this application.");
    return json(res, 200, storeV1(store));
  }

  r = m(/^\/v1\/eats\/store\/([^/]+)\/status$/);
  if (r) {
    const store = stores.find((s) => s.store_id === r![1]);
    if (req.method === "GET") {
      const token = authorize(req, res, ["eats.store", "eats.store.status.write"]);
      if (!token) return;
      if (!store || !provisionedToApp(store)) return fail(res, 404, "not_found", "Store not found or not provisioned to this application.");
      // A pause with an end time lifts itself.
      if (store.online.status === "PAUSED" && store.online.paused_until && new Date(store.online.paused_until) < new Date()) {
        store.online = { status: "ONLINE", paused_until: null, offline_reason: null };
      }
      return json(res, 200, {
        status: store.online.status,
        ...(store.online.paused_until ? { paused_until: store.online.paused_until } : {}),
        ...(store.online.offline_reason ? { offline_reason: store.online.offline_reason } : {}),
      });
    }
    if (req.method === "POST") {
      const token = authorize(req, res, ["eats.store.status.write"]);
      if (!token) return;
      if (!store || !provisionedToApp(store)) return fail(res, 404, "not_found", "Store not found or not provisioned to this application.");
      const body = parseJson(req.body);
      if (!body) return fail(res, 400, "bad_request", "Malformed JSON.");
      const status = body.status;
      if (status !== "ONLINE" && status !== "PAUSED") return fail(res, 400, "validation_failed", "status must be ONLINE or PAUSED.");
      if (status === "PAUSED") {
        const until = body.paused_until;
        if (until != null && (typeof until !== "string" || !ISO_NO_MS.test(until))) return fail(res, 400, "validation_failed", "paused_until must be an RFC 3339 timestamp.");
        store.online = { status: "PAUSED", paused_until: (until as string | undefined) ?? null, offline_reason: typeof body.reason === "string" ? body.reason : null };
      } else {
        store.online = { status: "ONLINE", paused_until: null, offline_reason: null };
      }
      note(`status: ${store.name} → ${status}${store.online.paused_until ? ` until ${store.online.paused_until}` : ""}`);
      json(res, 204);
      sendWebhook("store.status.changed", { user_id: store.store_id, resource_id: store.store_id, status: store.online.status.toLowerCase() });
      return;
    }
  }

  r = m(/^\/v1\/eats\/stores\/([^/]+)\/pos_data$/);
  if (r) {
    const store = stores.find((s) => s.store_id === r![1]);
    if (req.method === "POST") {
      const token = authorize(req, res, ["eats.pos_provisioning"]);
      if (!token) return;
      if (!store || store.merchantId !== token.merchantId) return fail(res, 404, "not_found", "Store not found for this merchant.");
      const body = parseJson(req.body);
      if (!body) return fail(res, 400, "bad_request", "Malformed JSON.");
      if (store.pos_data && store.pos_data.client_id !== CLIENT_ID && store.pos_data.integration_enabled) {
        return fail(res, 409, "conflict", "Store is integrated with another application.");
      }
      store.pos_data = {
        client_id: CLIENT_ID,
        integration_enabled: true,
        is_order_manager: body.is_order_manager === true,
        integrator_store_id: typeof body.integrator_store_id === "string" ? body.integrator_store_id : null,
        integrator_brand_id: typeof body.integrator_brand_id === "string" ? body.integrator_brand_id : null,
        store_configuration_data: typeof body.store_configuration_data === "string" ? body.store_configuration_data : null,
        is_order_manager_pending: false,
      };
      note(`pos_data: ${store.name} activated (order manager: ${store.pos_data.is_order_manager})`);
      json(res, 204);
      sendWebhook("store.provisioned", { user_id: store.store_id, resource_id: store.store_id, status: "provisioned" });
      return;
    }
    if (req.method === "GET") {
      const token = authorize(req, res, ["eats.store"]);
      if (!token) return;
      if (!store || !provisionedToApp(store)) return fail(res, 404, "not_found", "Store not found or not provisioned to this application.");
      return json(res, 200, storeV1(store).pos_data);
    }
    if (req.method === "PATCH") {
      const token = authorize(req, res, ["eats.store"]);
      if (!token) return;
      if (!store || store.pos_data?.client_id !== CLIENT_ID) return fail(res, 404, "not_found", "Store not found or not provisioned to this application.");
      const body = parseJson(req.body);
      if (!body) return fail(res, 400, "bad_request", "Malformed JSON.");
      if (typeof body.integration_enabled === "boolean") store.pos_data.integration_enabled = body.integration_enabled;
      if (typeof body.integrator_store_id === "string") store.pos_data.integrator_store_id = body.integrator_store_id;
      if (typeof body.store_configuration_data === "string") store.pos_data.store_configuration_data = body.store_configuration_data;
      if (typeof body.is_order_manager === "boolean") store.pos_data.is_order_manager = body.is_order_manager;
      note(`pos_data: ${store.name} patched (enabled: ${store.pos_data.integration_enabled}, order manager: ${store.pos_data.is_order_manager})`);
      return json(res, 204);
    }
    if (req.method === "DELETE") {
      const token = authorize(req, res, ["eats.pos_provisioning"]);
      if (!token) return;
      if (!store || store.merchantId !== token.merchantId) return fail(res, 404, "not_found", "Store not found for this merchant.");
      store.pos_data = null;
      note(`pos_data: ${store.name} integration removed by merchant`);
      json(res, 204);
      sendWebhook("store.deprovisioned", { user_id: store.store_id, resource_id: store.store_id, status: "deprovisioned" });
      return;
    }
  }

  // ── Orders ──
  r = m(/^\/v2\/eats\/order\/([^/]+)$/);
  if (r && req.method === "GET") {
    const token = authorize(req, res, ["eats.order", "eats.store.orders.read"]);
    if (!token) return;
    const o = orders.get(r[1]!);
    const store = o && stores.find((s) => s.store_id === o.storeId);
    if (!o || !store || !provisionedToApp(store)) return fail(res, 404, "not_found", "Order not found.");
    return json(res, 200, orderV2(o));
  }

  r = m(/^\/v1\/eats\/stores\/([^/]+)\/(created|canceled)-orders$/);
  if (r && req.method === "GET") {
    const token = authorize(req, res, ["eats.store.orders.read"]);
    if (!token) return;
    const store = stores.find((s) => s.store_id === r![1]);
    if (!store || !provisionedToApp(store)) return fail(res, 404, "not_found", "Store not found or not provisioned to this application.");
    const want = r[2] === "created" ? "CREATED" : "CANCELED";
    const limit = Number(url.searchParams.get("limit") ?? 50) || 50;
    const list = [...orders.values()]
      .filter((o) => o.storeId === store.store_id && o.current_state === want)
      .sort((a, b) => a.placed_at.localeCompare(b.placed_at))
      .slice(0, limit)
      .map((o) => ({ id: o.id, current_state: o.current_state, placed_at: o.placed_at }));
    return json(res, 200, { orders: list });
  }

  r = m(/^\/v1\/eats\/orders\/([^/]+)\/(accept_pos_order|deny_pos_order|cancel)$/);
  if (r && req.method === "POST") {
    const token = authorize(req, res, ["eats.order"]);
    if (!token) return;
    const o = orders.get(r[1]!);
    const store = o && stores.find((s) => s.store_id === o.storeId);
    if (!o || !store || !provisionedToApp(store)) return fail(res, 404, "not_found", "Order not found.");
    const body = parseJson(req.body) ?? {};
    // Uber: "You must be the store's nominated order manager app to call this endpoint."
    if ((r[2] === "accept_pos_order" || r[2] === "deny_pos_order") && !store.pos_data?.is_order_manager) {
      return fail(res, 403, "forbidden", "Application is not the order manager for this store.");
    }
    if (r[2] === "accept_pos_order") {
      if (o.current_state !== "CREATED") return fail(res, 409, "conflict", `Order is ${o.current_state}.`);
      if (typeof body.reason !== "string") return fail(res, 400, "validation_failed", "reason is required.");
      o.current_state = "ACCEPTED";
      assignCourier(o);
    } else if (r[2] === "deny_pos_order") {
      if (o.current_state !== "CREATED") return fail(res, 409, "conflict", `Order is ${o.current_state}.`);
      const reason = (body.reason ?? {}) as { code?: unknown; explanation?: unknown };
      const codes = ["STORE_CLOSED", "POS_NOT_READY", "POS_OFFLINE", "ITEM_AVAILABILITY", "MISSING_ITEM", "MISSING_INFO", "PRICING", "CAPACITY", "ADDRESS", "SPECIAL_INSTRUCTIONS", "OTHER"];
      if (typeof reason.code !== "string" || !codes.includes(reason.code) || typeof reason.explanation !== "string") {
        return fail(res, 400, "validation_failed", `reason.code must be one of ${codes.join(", ")} and reason.explanation a string.`);
      }
      o.current_state = "DENIED";
      o.deny_reason = { type: reason.code, info: reason.explanation };
    } else {
      if (o.current_state === "FINISHED" || o.current_state === "CANCELED") return fail(res, 409, "conflict", `Order is ${o.current_state}.`);
      o.current_state = "CANCELED";
      o.cancel_reason = String(body.reason ?? "OUT_OF_ITEMS");
      orderEvent("orders.cancel", o);
    }
    note(`order #${o.display_id} → ${o.current_state} (API)`);
    return json(res, 204);
  }

  // ── Control panel (not Uber) ──
  if (p === "/" && req.method === "GET") return html(res, dashboard());

  if (p.startsWith("/_mock/") && req.method === "POST") {
    const form = new URLSearchParams(req.body);
    const store = stores.find((s) => s.store_id === form.get("store"));
    const o = orders.get(form.get("order") ?? "");
    switch (p) {
      case "/_mock/order": {
        if (!store) return fail(res, 400, "bad_request", "store?");
        const created = createOrder(store, { type: (form.get("type") as OrderType) || undefined });
        note(`order #${created.display_id} placed at ${store.name} (${created.type}, ${created.items.length} lines)`);
        if (provisionedToApp(store)) orderEvent("orders.notification", created);
        else note("store not provisioned to the app: no webhook sent");
        // Nobody accepted in 11.5 minutes: Uber cancels it (only bites when an app manages orders).
        setTimeout(() => {
          const s2 = stores.find((x) => x.store_id === created.storeId);
          if (created.current_state === "CREATED" && s2?.pos_data?.is_order_manager) {
            created.current_state = "CANCELED";
            created.cancel_reason = "RESTAURANT_UNRESPONSIVE";
            note(`order #${created.display_id} auto-canceled: not accepted within 11.5 min`);
            orderEvent("orders.cancel", created);
          }
        }, 11.5 * 60_000);
        break;
      }
      case "/_mock/accept":
        if (o && o.current_state === "CREATED") {
          o.current_state = "ACCEPTED";
          assignCourier(o);
          note(`order #${o.display_id} accepted on the tablet${o.courier ? `, courier ${o.courier.first_name} assigned` : ""} (no webhook; the hub's hourly reconcile picks it up)`);
        }
        break;
      case "/_mock/finish":
        if (o && (o.current_state === "ACCEPTED" || o.current_state === "CREATED")) {
          o.current_state = "FINISHED";
          if (o.courier) {
            o.courier.current_state = "EN_ROUTE_TO_DROPOFF";
            const courier = o.courier;
            setTimeout(() => (courier.current_state = "COMPLETED"), 20_000);
          }
          note(`order #${o.display_id} finished (no webhook; reconcile picks it up)`);
        }
        break;
      case "/_mock/cancel":
        if (o && o.current_state !== "FINISHED" && o.current_state !== "CANCELED") {
          o.current_state = "CANCELED";
          o.cancel_reason = "CUSTOMER_CALLED_TO_CANCEL";
          note(`order #${o.display_id} canceled by Uber`);
          orderEvent("orders.cancel", o);
        }
        break;
      case "/_mock/release":
        if (o && o.current_state === "ACCEPTED") {
          if (o.courier) o.courier.current_state = "ARRIVED_AT_PICKUP";
          note(`order #${o.display_id}: courier at the restaurant`);
          orderEvent("orders.release", o);
        }
        break;
      case "/_mock/deprovision":
        if (store && store.pos_data) {
          store.pos_data = null;
          note(`${store.name}: Client Hub removed in Uber Eats Manager`);
          sendWebhook("store.deprovisioned", { user_id: store.store_id, resource_id: store.store_id, status: "deprovisioned" });
        }
        break;
      case "/_mock/provision":
        // Uber support provisioning a store straight to the app (sandbox test stores).
        if (store) {
          store.pos_data = { client_id: CLIENT_ID, integration_enabled: true, is_order_manager: false, integrator_store_id: null, integrator_brand_id: null, store_configuration_data: null, is_order_manager_pending: false };
          note(`${store.name}: provisioned to the app by "Uber support"`);
          sendWebhook("store.provisioned", { user_id: store.store_id, resource_id: store.store_id, status: "provisioned" });
        }
        break;
      case "/_mock/menu-refresh":
        if (store) sendWebhook("store.menu_refresh_request", { user_id: store.store_id, resource_id: store.store_id, status: "requested" });
        break;
      case "/_mock/tablet-pause":
        if (store) {
          store.online = store.online.status === "ONLINE" ? { status: "PAUSED", paused_until: null, offline_reason: "Paused on the tablet" } : { status: "ONLINE", paused_until: null, offline_reason: null };
          note(`${store.name}: tablet set ${store.online.status}`);
          sendWebhook("store.status.changed", { user_id: store.store_id, resource_id: store.store_id, status: store.online.status.toLowerCase() });
        }
        break;
      case "/_mock/resend": {
        const d = deliveries.find((x) => x.id === form.get("delivery"));
        if (d) {
          const parsed = JSON.parse(d.body) as { event_type: string; meta: { user_id: string; resource_id: string; status: string }; resource_href: string };
          sendWebhook(parsed.event_type, parsed.meta, parsed.resource_href);
        }
        break;
      }
      case "/_mock/reconcile": {
        if (!INTERNAL_API_SECRET) {
          note("reconcile: INTERNAL_API_SECRET missing in apps/api/.env");
          break;
        }
        try {
          const r2 = await fetch(`${API_URL}/api/cron/uber-eats`, { headers: { Authorization: `Bearer ${INTERNAL_API_SECRET}` } });
          note(`reconcile → ${r2.status} ${await r2.text()}`);
        } catch (error) {
          note(`reconcile → unreachable (${(error as Error).message})`);
        }
        break;
      }
      case "/_mock/reset":
        orders.clear();
        for (const s of stores) {
          s.pos_data = null;
          s.online = { status: "ONLINE", paused_until: null, offline_reason: null };
        }
        note("reset: stores unprovisioned, orders cleared");
        break;
      default:
        return fail(res, 404, "not_found", "Unknown control action.");
    }
    return redirect(res, "/");
  }

  return fail(res, 404, "not_found", `No route for ${req.method} ${p}`);
};

// ─── Control panel HTML ──────────────────────────────────────────

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const page = (title: string, body: string) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} · Uber mock</title>
<style>
body{font:14px/1.45 ui-sans-serif,system-ui,sans-serif;margin:0;background:#f6f6f6;color:#111}
main{max-width:980px;margin:0 auto;padding:28px 20px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px}
.dim{color:#666}.card{background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:14px 16px;margin:10px 0}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
button{height:30px;padding:0 10px;border:1px solid #cfcfcf;border-radius:6px;background:#fff;cursor:pointer;font:inherit;font-size:13px}
button.primary{background:#000;color:#fff;border-color:#000}button.green{background:#06C167;border-color:#06C167;color:#000}
form.inline{display:inline}select{height:30px;font:inherit}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top}
.tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:12px;background:#eee}.tag.on{background:#e6f4ec;color:#1e7a45}.tag.off{background:#fceded;color:#a12c2c}
pre{font-size:12px;white-space:pre-wrap;margin:0}code{font-size:12px}
.badge{font-size:11px;background:#000;color:#fff;border-radius:4px;padding:1px 6px;margin-left:6px}
</style></head><body><main><h1>${esc(title)}<span class="badge">mock</span></h1>${body}</main></body></html>`;

const btn = (action: string, label: string, fields: Record<string, string>, cls = "") =>
  `<form class="inline" method="post" action="/_mock/${action}">${Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join("")}<button class="${cls}">${esc(label)}</button></form>`;

const dashboard = () => {
  const storeCards = stores
    .map((s) => {
      const prov = s.pos_data;
      const list = [...orders.values()].filter((o) => o.storeId === s.store_id).sort((a, b) => b.placed_at.localeCompare(a.placed_at)).slice(0, 15);
      const rows = list
        .map(
          (o) => `<tr><td><b>#${o.display_id}</b><br><span class="dim">${o.eater.first_name} · ${o.type.replace(/_/g, " ").toLowerCase()}</span>${o.merchant_promo ? `<br><span class="tag">10% promo, restaurant-funded</span>` : ""}</td>
          <td>${o.items.map((i) => `${i.quantity}× ${esc(i.title)}${i.modifiers.length ? ` <span class="dim">(${i.modifiers.map((x) => esc(x.option.title)).join(", ")})</span>` : ""}`).join("<br>")}</td>
          <td><span class="tag">${o.current_state}</span><br><span class="dim">${o.placed_at.slice(11, 19)}Z</span>${o.courier ? `<br><span class="dim">🚗 ${o.courier.first_name} · ${o.courier.current_state.toLowerCase().replace(/_/g, " ")}</span>` : ""}</td>
          <td class="row">${o.current_state === "CREATED" ? btn("accept", "Accept on tablet", { order: o.id }) : ""}${o.current_state === "ACCEPTED" || o.current_state === "CREATED" ? btn("finish", "Finish", { order: o.id }) : ""}${o.current_state === "ACCEPTED" && o.type === "DELIVERY_BY_UBER" ? btn("release", "Courier arrived", { order: o.id }) : ""}${o.current_state !== "FINISHED" && o.current_state !== "CANCELED" ? btn("cancel", "Cancel", { order: o.id }) : ""}</td></tr>`
        )
        .join("");
      return `<div class="card">
        <div class="row" style="justify-content:space-between;margin:0">
          <div><b>${esc(s.name)}</b> <span class="dim">· ${esc(s.location.address)}, ${esc(s.location.city)} · ${merchants.find((mm) => mm.id === s.merchantId)!.label.split(" (")[0]}</span><br>
          <code class="dim">${s.store_id}</code></div>
          <div>${prov ? `<span class="tag ${prov.integration_enabled ? "on" : "off"}">${prov.integration_enabled ? "integrated with Client Hub" : "integration disabled"}</span>${prov.is_order_manager ? ` <span class="tag on">hub is order manager</span>` : ""}` : `<span class="tag">not integrated</span>`}
          <span class="tag ${s.online.status === "ONLINE" ? "on" : "off"}">${s.online.status}${s.online.paused_until ? ` until ${s.online.paused_until.slice(11, 16)}Z` : ""}</span></div>
        </div>
        <div class="row">
          ${btn("order", "New order", { store: s.store_id }, "green")}
          ${btn("order", "New pickup order", { store: s.store_id, type: "PICK_UP" })}
          ${btn("order", "New own-delivery order", { store: s.store_id, type: "DELIVERY_BY_RESTAURANT" })}
          ${btn("tablet-pause", s.online.status === "ONLINE" ? "Pause on tablet" : "Resume on tablet", { store: s.store_id })}
          ${btn("menu-refresh", "Ask for menu refresh", { store: s.store_id })}
          ${prov ? btn("deprovision", "Remove app in Uber Eats Manager", { store: s.store_id }) : btn("provision", "Provision to app (as Uber support)", { store: s.store_id })}
        </div>
        ${rows ? `<table style="margin-top:10px"><tr><th>Order</th><th>Items</th><th>State</th><th></th></tr>${rows}</table>` : `<p class="dim" style="margin:10px 0 0">No orders yet.</p>`}
      </div>`;
    })
    .join("");

  const deliveryRows = deliveries
    .slice(0, 20)
    .map((d) => `<tr><td>${esc(d.type)}</td><td><span class="tag ${d.lastStatus === "200" ? "on" : "off"}">${esc(d.lastStatus)}</span> <span class="dim">× ${d.attempts}</span></td><td>${btn("resend", "Resend", { delivery: d.id })}</td></tr>`)
    .join("");

  return page(
    "Uber Eats stand-in",
    `<p class="dim">Pretends to be <code>sandbox-login.uber.com</code> + <code>test-api.uber.com</code> on <code>${SELF}</code>. Webhooks go to <code>${esc(WEBHOOK_URL)}</code>, signed with your client secret. Client id <code>${esc(CLIENT_ID)}</code>.</p>
     <div class="row">${btn("reconcile", "Run hub reconcile cron now", {}, "primary")}${btn("reset", "Reset everything", {})}<button onclick="location.reload()">Refresh</button></div>
     <h2>Stores</h2>${storeCards}
     <h2>Webhook deliveries</h2><div class="card">${deliveryRows ? `<table><tr><th>Event</th><th>Last answer</th><th></th></tr>${deliveryRows}</table>` : `<p class="dim" style="margin:0">None yet. Connect a store or place an order.</p>`}</div>
     <h2>Log</h2><div class="card"><pre>${log.slice(0, 60).map((l) => `${l.at}  ${esc(l.line)}`).join("\n") || "quiet"}</pre></div>
     <h2>How to test the hub</h2><div class="card"><ol style="margin:0;padding-left:18px">
       <li>apps/api/.env: <code>UBER_EATS_AUTH_URL=${SELF}</code> and <code>UBER_EATS_API_URL=${SELF}</code>, restart the api.</li>
       <li>In the hub, add the Uber Eats app to a project and press <b>Connect Uber Eats</b>. Pick "Tony's" for the one-store path or "Bunny's" for the store picker.</li>
       <li>Here: <b>New order</b> on that store. The hub gets <code>orders.notification</code> and shows it within a minute.</li>
       <li><b>Accept on tablet</b> / <b>Finish</b> send no webhook (Uber doesn't either). Press <b>Run hub reconcile cron now</b> to see the hub catch up. Opening an order in the hub also re-reads it live.</li>
       <li>Accepting a Uber-delivery order assigns a courier; open that order in the hub to see the courier card. <b>Courier arrived</b> moves them to the restaurant.</li>
       <li>Turn on <b>Accept orders in Client Hub</b> on the hub's store card: the app becomes order manager here, Accept / Deny work from the hub, and orders nobody accepts cancel after 11.5 minutes (with an <code>orders.cancel</code> webhook).</li>
       <li>Pause from the hub, then check the store's status badge here. <b>Pause on tablet</b> goes the other way.</li>
     </ol></div>`
  );
};

// ─── Boot ────────────────────────────────────────────────────────

createServer(async (rawReq, res) => {
  const req = rawReq as Req;
  req.body = await readBody(rawReq);
  try {
    await route(req, res);
  } catch (error) {
    console.error("[uber-mock] route crashed", error);
    if (!res.headersSent) fail(res, 500, "internal_server_error", "Mock crashed; see its terminal.");
  }
}).listen(PORT, () => {
  console.log(`Uber Eats stand-in on ${SELF}`);
  console.log(`  client id      ${CLIENT_ID}${CLIENT_ID === "mock-client-id" ? "  (no UBER_EATS_CLIENT_ID in apps/api/.env, using a placeholder)" : ""}`);
  console.log(`  webhooks  →    ${WEBHOOK_URL}`);
  console.log(`  hub api        ${API_URL}`);
  console.log(`  set in apps/api/.env: UBER_EATS_AUTH_URL=${SELF}  UBER_EATS_API_URL=${SELF}`);
});
