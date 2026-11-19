import { createHmac, timingSafeEqual } from "crypto";

import type {
  UberOnlineStatus,
  UberOrderItem,
  UberOrderState,
  UberOrderType,
} from "@workspace/drizzle/schema";

// ─── Uber Eats app: pure helpers (no I/O, unit-tested) ───────────

export type UberEnv = "sandbox" | "production";

/** Sandbox and production hosts must match (token from one, API from the other = 401). */
export const uberHosts = (env: string | undefined) =>
  env === "production"
    ? { auth: "https://auth.uber.com", api: "https://api.uber.com" }
    : { auth: "https://sandbox-login.uber.com", api: "https://test-api.uber.com" };

export const uberEnv = (env: string | undefined): UberEnv =>
  env === "production" ? "production" : "sandbox";

/** The merchant's one-time grant: list their stores and activate ours on one. */
export const MERCHANT_SCOPE = "eats.pos_provisioning";
/** The app's own token for store details and online status. */
export const STORE_SCOPES = "eats.store eats.store.status.write";
/** The app's own token for reading orders. */
export const ORDER_SCOPES = "eats.order eats.store.orders.read";

// ─── Signed OAuth state ──────────────────────────────────────────

const fromB64url = (s: string) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const safeEqual = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

export type UberState = { projectId: string; userId: string; exp: number };

const STATE_TTL_SECONDS = 30 * 60;

/** Signed connect state (project + user), carried through Uber's authorize URL. */
export function signUberState(
  data: { projectId: string; userId: string },
  secret: string,
  now = Date.now()
): string {
  const payload: UberState = { ...data, exp: Math.floor(now / 1000) + STATE_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(`uber:${body}`).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyUberState(token: string, secret: string, now = Date.now()): UberState | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !secret) return null;
  const expected = createHmac("sha256", secret).update(`uber:${body}`).digest();
  if (!safeEqual(fromB64url(sig), expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UberState;
    if (!data.projectId || !data.userId || data.exp * 1000 < now) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Webhooks ────────────────────────────────────────────────────

/**
 * Uber signs every webhook: X-Uber-Signature = lowercase hex
 * HMAC-SHA256(raw body) keyed with the app's client secret.
 */
export function verifyUberSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = signature.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(given)) return false;
  return safeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
}

export type UberEvent = {
  event_id?: string;
  event_type: string;
  event_time?: number;
  resource_href?: string;
  meta?: {
    /** The store id. */
    user_id?: string;
    /** The order id for orders.* events. */
    resource_id?: string;
    status?: string;
  };
};

export const isOrderEvent = (type: string) => type.startsWith("orders.");

/** Store and order ids of a webhook, or null when it carries none. */
export function eventIds(event: UberEvent) {
  const storeId = event.meta?.user_id?.trim();
  const orderId = event.meta?.resource_id?.trim();
  return { storeId: storeId || null, orderId: orderId || null };
}

// ─── Store ───────────────────────────────────────────────────────

export type UberStore = {
  store_id: string;
  name?: string;
  location?: {
    address?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  status?: string;
  timezone?: string;
  web_url?: string;
  merchant_store_id?: string;
  pos_data?: { integration_enabled?: boolean };
};

export type UberStoreStatus = {
  status?: string;
  offline_reason?: string;
  paused_until?: string;
};

/** One line of address for the store card and the store picker. */
export function storeAddress(location: UberStore["location"] | undefined): string | null {
  if (!location) return null;
  const street = [location.address, location.address_2].filter(Boolean).join(", ");
  const town = [location.city, [location.state, location.postal_code].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [street, town].filter(Boolean).join(", ") || null;
}

/** Store columns from Uber's store object. */
export function mapStore(store: UberStore) {
  return {
    storeId: store.store_id,
    name: store.name?.trim() || "Uber Eats store",
    address: storeAddress(store.location),
    city: store.location?.city ?? null,
    state: store.location?.state ?? null,
    postalCode: store.location?.postal_code ?? null,
    timezone: store.timezone ?? null,
    webUrl: store.web_url ?? null,
    listingStatus: store.status ?? null,
  };
}

const parseDate = (value: string | undefined): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Online-status columns from GET /status. Unknown values read as null, never invented. */
export function mapStoreStatus(status: UberStoreStatus) {
  const value = status.status?.toUpperCase();
  const online: UberOnlineStatus | null =
    value === "ONLINE" ? "ONLINE" : value === "PAUSED" || value === "OFFLINE" ? "PAUSED" : null;
  return {
    onlineStatus: online,
    pausedUntil: online === "PAUSED" ? parseDate(status.paused_until) : null,
    offlineReason: online === "PAUSED" ? status.offline_reason?.trim() || null : null,
  };
}

// ─── Orders ──────────────────────────────────────────────────────

export type UberMoney = { amount?: number; currency_code?: string; formatted_amount?: string };

export type UberOrderV2 = {
  id: string;
  display_id?: string;
  current_state?: string;
  type?: string;
  placed_at?: string;
  estimated_ready_for_pickup_at?: string;
  store?: { id?: string };
  eater?: { first_name?: string };
  cart?: { items?: Array<{ title?: string; quantity?: number }> };
  payment?: { charges?: { sub_total?: UberMoney; tax?: UberMoney; total?: UberMoney } };
};

const ORDER_STATES: UberOrderState[] = ["CREATED", "ACCEPTED", "DENIED", "FINISHED", "CANCELED"];
const ORDER_TYPES: UberOrderType[] = [
  "PICK_UP",
  "DINE_IN",
  "DELIVERY_BY_UBER",
  "DELIVERY_BY_RESTAURANT",
];

export const orderState = (value: string | undefined): UberOrderState =>
  ORDER_STATES.find((s) => s === value?.toUpperCase()) ?? "UNKNOWN";

export const orderType = (value: string | undefined): UberOrderType =>
  ORDER_TYPES.find((t) => t === value?.toUpperCase()) ?? "UNKNOWN";

/** Orders still open: the hourly reconcile re-reads these to catch the final state. */
export const OPEN_ORDER_STATES: UberOrderState[] = ["CREATED", "ACCEPTED", "UNKNOWN"];
/** Orders that count as sales (a denied or canceled order sold nothing). */
export const SOLD_ORDER_STATES: UberOrderState[] = ["CREATED", "ACCEPTED", "FINISHED"];

/**
 * Uber's money `amount` is in the currency's minor unit (1234 = $12.34). A
 * fractional amount can only mean major units, so it's converted.
 */
export function moneyToCents(money: UberMoney | undefined): number | null {
  const amount = money?.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  return Number.isInteger(amount) ? amount : Math.round(amount * 100);
}

/** Order columns from GET /v2/eats/order/{id}. */
export function mapOrder(order: UberOrderV2) {
  const items: UberOrderItem[] = (order.cart?.items ?? [])
    .map((i) => ({
      title: i.title?.trim() || "Item",
      quantity: Math.max(1, Math.round(i.quantity ?? 1)),
    }));
  const placedAt = parseDate(order.placed_at) ?? new Date();
  const total = order.payment?.charges?.total;
  return {
    id: order.id,
    storeId: order.store?.id ?? null,
    displayId: order.display_id?.trim() || order.id.slice(-5).toUpperCase(),
    state: orderState(order.current_state),
    type: orderType(order.type),
    placedAt,
    readyAt: parseDate(order.estimated_ready_for_pickup_at),
    eaterFirstName: order.eater?.first_name?.trim() || null,
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotalCents: moneyToCents(order.payment?.charges?.sub_total),
    taxCents: moneyToCents(order.payment?.charges?.tax),
    totalCents: moneyToCents(total),
    currency: total?.currency_code ?? order.payment?.charges?.sub_total?.currency_code ?? null,
  };
}

// ─── Pause durations ─────────────────────────────────────────────

import { PAUSE_CHOICES, type PauseChoice } from "./uber-eats-constants";

export { PAUSE_CHOICES, type PauseChoice };

/**
 * Wall-clock offset of `timeZone` at `now`, in ms (minute precision). Both
 * strings are parsed in the machine's zone, so the difference is the zone's
 * offset no matter where the server runs.
 */
const tzOffsetMs = (timeZone: string, now: Date) => {
  try {
    const wall = (tz: string) => new Date(now.toLocaleString("en-US", { timeZone: tz })).getTime();
    return wall(timeZone) - wall("UTC");
  } catch {
    return 0;
  }
};

/** The next local midnight in the store's timezone. */
export function nextMidnightIn(timeZone: string | null, now = new Date()): Date {
  const tz = timeZone || "UTC";
  const offset = tzOffsetMs(tz, now);
  const local = new Date(now.getTime() + offset);
  const midnightLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 1
  );
  return new Date(midnightLocal - offset);
}

/** When a pause ends, or null for "until I resume". */
export function pauseUntil(choice: PauseChoice, timeZone: string | null, now = new Date()): Date | null {
  switch (choice) {
    case "30m":
      return new Date(now.getTime() + 30 * 60_000);
    case "1h":
      return new Date(now.getTime() + 60 * 60_000);
    case "2h":
      return new Date(now.getTime() + 2 * 60 * 60_000);
    case "today":
      return nextMidnightIn(timeZone, now);
    case "indefinite":
      return null;
  }
}

/** Uber wants `YYYY-MM-DDTHH:mm:ssZ`, no milliseconds. */
export const uberTimestamp = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");
