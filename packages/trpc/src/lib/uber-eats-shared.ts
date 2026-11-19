import { createHmac, timingSafeEqual } from "crypto";

import type {
  UberOnlineStatus,
  UberOrderItem,
  UberOrderState,
  UberOrderType,
} from "@workspace/drizzle/schema";

// ─── Uber Eats app: pure helpers (no I/O, unit-tested) ───────────

export type UberEnv = "sandbox" | "production";

/**
 * Sandbox and production hosts must match (token from one, API from the other
 * = 401). `overrides` point both at a local stand-in (apps/api/scripts/uber-mock.ts).
 */
export const uberHosts = (
  env: string | undefined,
  overrides?: { auth?: string | null; api?: string | null }
) => {
  const real =
    env === "production"
      ? { auth: "https://auth.uber.com", api: "https://api.uber.com" }
      : { auth: "https://sandbox-login.uber.com", api: "https://test-api.uber.com" };
  return {
    auth: overrides?.auth?.replace(/\/$/, "") || real.auth,
    api: overrides?.api?.replace(/\/$/, "") || real.api,
  };
};

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

/** orders.notification, orders.cancel, order.fulfillment_issues.resolved, … (Uber mixes singular and plural). */
export const isOrderEvent = (type: string) => /^orders?\./.test(type);

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

export type UberModifierGroup = {
  id?: string;
  title?: string;
  external_data?: string;
  selected_items?: UberCartItem[];
};

export type UberCartItem = {
  id?: string;
  instance_id?: string;
  title?: string;
  quantity?: number;
  price?: { unit_price?: UberMoney; total_price?: UberMoney };
  selected_modifier_groups?: UberModifierGroup[];
  special_instructions?: string;
};

export type UberDelivery = {
  id?: string;
  first_name?: string;
  picture_url?: string;
  vehicle?: { make?: string; model?: string; color?: string; license_plate?: string; is_autonomous?: boolean };
  estimated_pickup_time?: string;
  current_state?: string;
  phone?: string;
  phone_code?: string;
};

export type UberCharges = {
  total?: UberMoney;
  sub_total?: UberMoney;
  tax?: UberMoney;
  total_fee?: UberMoney;
  total_fee_tax?: UberMoney;
  bag_fee?: UberMoney;
  total_promo_applied?: UberMoney;
  sub_total_promo_applied?: UberMoney;
  tax_promo_applied?: UberMoney;
  pick_and_pack_fee?: UberMoney;
  delivery_fee?: UberMoney;
  delivery_fee_tax?: UberMoney;
  small_order_fee?: UberMoney;
  small_order_fee_tax?: UberMoney;
  tip?: UberMoney;
  cash_amount_due?: UberMoney;
  marketplace_fee_due_to_uber?: UberMoney;
};

export type UberTaxLine = { tax_remittance?: string; tax_amount?: UberMoney; amount?: UberMoney; title?: string };

export type UberOrderV2 = {
  id: string;
  display_id?: string;
  current_state?: string;
  type?: string;
  placed_at?: string;
  estimated_ready_for_pickup_at?: string;
  store?: { id?: string; name?: string };
  eater?: { first_name?: string };
  cart?: { items?: UberCartItem[]; special_instructions?: string };
  payment?: {
    charges?: UberCharges;
    accounting?: { tax_remittance?: { tax?: { uber?: UberTaxLine[]; restaurant?: UberTaxLine[] } } };
    promotions?: {
      promotions?: Array<{
        promo_type?: string;
        promo_discount_value?: number;
        promo_funding_splits?: Array<{ funding_source?: string; amount?: UberMoney | number }>;
      }>;
    };
  };
  deliveries?: UberDelivery[];
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

type UberPromotions = NonNullable<NonNullable<UberOrderV2["payment"]>["promotions"]>;

const splitAmount = (amount: UberMoney | number | undefined) =>
  typeof amount === "number" ? moneyToCents({ amount }) : moneyToCents(amount);

/**
 * The promo the restaurant paid for, if any. Uber's `promotions[].promo_funding_splits`
 * say who funded what, so that list wins when it's there (an empty list = no
 * promo). Without it, `sub_total − sub_total_promo_applied` ("with Merchant
 * Funded Promotions applied"), but only when the applied subtotal is a real
 * number: a bare 0 next to a non-zero subtotal is a missing value, not a
 * 100% discount. Null when Uber sends nothing usable.
 */
export function merchantPromoCents(
  charges: UberCharges | undefined,
  promotions?: UberPromotions | null
): number | null {
  if (promotions?.promotions) {
    return promotions.promotions.reduce((n, promo) => {
      const splits = promo.promo_funding_splits ?? [];
      const mine = splits
        .filter((s) => /organization|merchant|restaurant|store/i.test(s.funding_source ?? ""))
        .reduce((m, s) => m + (splitAmount(s.amount) ?? 0), 0);
      // No split detail but a merchant promo listed: fall back to its face value.
      return n + (splits.length ? mine : 0);
    }, 0);
  }
  const sub = moneyToCents(charges?.sub_total);
  const applied = moneyToCents(charges?.sub_total_promo_applied);
  if (sub == null || applied == null) return null;
  if (applied === 0 && sub > 0) return null;
  return Math.max(0, sub - applied);
}

/** Tax the restaurant remits itself (the rest Uber remits). Null when Uber sends no breakdown. */
export function taxMerchantCents(order: UberOrderV2): number | null {
  const lines = order.payment?.accounting?.tax_remittance?.tax;
  if (!lines || (!lines.restaurant && !lines.uber)) return null;
  return (lines.restaurant ?? []).reduce((n, l) => n + (moneyToCents(l.tax_amount ?? l.amount) ?? 0), 0);
}

/** Order columns from GET /v2/eats/order/{id}. */
export function mapOrder(order: UberOrderV2) {
  const items: UberOrderItem[] = (order.cart?.items ?? [])
    .map((i) => ({
      title: i.title?.trim() || "Item",
      quantity: Math.max(1, Math.round(i.quantity ?? 1)),
    }));
  const placedAt = parseDate(order.placed_at) ?? new Date();
  const charges = order.payment?.charges;
  const total = charges?.total;
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
    subtotalCents: moneyToCents(charges?.sub_total),
    taxCents: moneyToCents(charges?.tax),
    totalCents: moneyToCents(total),
    currency: total?.currency_code ?? charges?.sub_total?.currency_code ?? null,
    merchantPromoCents: merchantPromoCents(charges, order.payment?.promotions),
    merchantFeeCents: moneyToCents(charges?.total_fee),
    tipCents: moneyToCents(charges?.tip),
    uberFeeCents: moneyToCents(charges?.marketplace_fee_due_to_uber),
    taxMerchantCents: taxMerchantCents(order),
  };
}

// ─── Order detail (live, never stored) ───────────────────────────

export type OrderLineModifier = { group: string; items: { title: string; quantity: number; priceCents: number | null }[] };

const flattenModifiers = (groups: UberModifierGroup[] | undefined, prefix = ""): OrderLineModifier[] => {
  const out: OrderLineModifier[] = [];
  for (const g of groups ?? []) {
    const label = [prefix, g.title?.trim() || "Options"].filter(Boolean).join(" › ");
    const items = (g.selected_items ?? []).map((i) => ({
      title: i.title?.trim() || "Option",
      quantity: Math.max(1, Math.round(i.quantity ?? 1)),
      priceCents: moneyToCents(i.price?.total_price ?? i.price?.unit_price),
    }));
    if (items.length) out.push({ group: label, items });
    for (const i of g.selected_items ?? []) out.push(...flattenModifiers(i.selected_modifier_groups, label));
  }
  return out;
};

const COURIER_STATES: Record<string, string> = {
  SCHEDULED: "Scheduled",
  EN_ROUTE_TO_PICKUP: "On the way to pick up",
  ARRIVED_AT_PICKUP: "At the restaurant",
  EN_ROUTE_TO_DROPOFF: "Delivering",
  ARRIVED_AT_DROPOFF: "At the customer",
  COMPLETED: "Delivered",
  FAILED: "Delivery failed",
};

/** Human label for Uber's courier state; unknown states are title-cased, never hidden. */
export function courierStateLabel(state: string | undefined): string | null {
  if (!state) return null;
  const key = state.toUpperCase();
  if (COURIER_STATES[key]) return COURIER_STATES[key]!;
  return key.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** The courier Uber assigned (the latest one if it re-assigned), or null before that. */
export function mapCourier(deliveries: UberDelivery[] | undefined) {
  const d = deliveries?.length ? deliveries[deliveries.length - 1]! : null;
  if (!d) return null;
  const v = d.vehicle;
  const vehicle = [v?.color, v?.make, v?.model].map((x) => x?.trim()).filter(Boolean).join(" ") || null;
  return {
    name: d.first_name?.trim() || "Courier",
    photoUrl: d.picture_url?.trim() || null,
    vehicle,
    plate: v?.license_plate?.trim() || null,
    state: d.current_state ?? null,
    stateLabel: courierStateLabel(d.current_state),
    etaPickup: parseDate(d.estimated_pickup_time),
    phone: d.phone?.trim() || null,
    phoneCode: d.phone_code?.trim() || null,
  };
}

/** Everything the order dialog shows. Built from Uber's live answer, nothing here is saved. */
export function mapOrderDetail(order: UberOrderV2) {
  const base = mapOrder(order);
  const charges = order.payment?.charges;
  const lines = (order.cart?.items ?? []).map((i) => {
    const quantity = Math.max(1, Math.round(i.quantity ?? 1));
    const unitCents = moneyToCents(i.price?.unit_price);
    return {
      title: i.title?.trim() || "Item",
      quantity,
      unitCents,
      totalCents: moneyToCents(i.price?.total_price) ?? (unitCents != null ? unitCents * quantity : null),
      instructions: i.special_instructions?.trim() || null,
      modifiers: flattenModifiers(i.selected_modifier_groups),
    };
  });
  return {
    ...base,
    lines,
    specialInstructions: order.cart?.special_instructions?.trim() || null,
    charges: {
      subtotalCents: base.subtotalCents,
      promoCents: base.merchantPromoCents,
      taxCents: base.taxCents,
      serviceFeeCents: moneyToCents(charges?.total_fee),
      deliveryFeeCents: moneyToCents(charges?.delivery_fee),
      smallOrderFeeCents: moneyToCents(charges?.small_order_fee),
      bagFeeCents: moneyToCents(charges?.bag_fee),
      tipCents: base.tipCents,
      totalCents: base.totalCents,
      cashDueCents: moneyToCents(charges?.cash_amount_due),
    },
    courier: mapCourier(order.deliveries),
  };
}

// ─── Payout estimate ─────────────────────────────────────────────

export type PayoutInputs = {
  subtotalCents: number | null;
  merchantPromoCents: number | null;
  merchantFeeCents: number | null;
  tipCents: number | null;
  uberFeeCents: number | null;
  taxMerchantCents: number | null;
  commissionBps: number | null;
};

/**
 * What the restaurant likely keeps on one order. Uber's feed has no
 * commission, so the owner's contract rate (basis points) does the work:
 *   base = subtotal − promo the restaurant funded
 *   commission = base × rate
 *   payout = base − commission + tax the restaurant remits + fees paid to it + tip − Uber marketplace fee
 * Null without a rate or a subtotal. An estimate, always labelled as one.
 */
export function estimatePayout(x: PayoutInputs): { commissionCents: number; payoutCents: number } | null {
  if (x.commissionBps == null || x.subtotalCents == null) return null;
  const base = Math.max(0, x.subtotalCents - (x.merchantPromoCents ?? 0));
  const commissionCents = Math.round((base * x.commissionBps) / 10_000);
  const payoutCents =
    base - commissionCents + (x.taxMerchantCents ?? 0) + (x.merchantFeeCents ?? 0) + (x.tipCents ?? 0) - (x.uberFeeCents ?? 0);
  return { commissionCents, payoutCents };
}

export const percentToBps = (percent: number) => Math.round(percent * 100);
export const bpsToPercent = (bps: number) => bps / 100;

// ─── Pause durations ─────────────────────────────────────────────

import { ACCEPT_WINDOW_MS, DENY_CODES, DENY_REASONS, PAUSE_CHOICES, type DenyCode, type PauseChoice } from "./uber-eats-constants";

export { ACCEPT_WINDOW_MS, DENY_CODES, DENY_REASONS, PAUSE_CHOICES, type DenyCode, type PauseChoice };

/** When Uber will cancel a still-unaccepted order, and how long is left (0 when past). */
export function acceptDeadline(placedAt: Date, now = new Date()) {
  const deadline = new Date(placedAt.getTime() + ACCEPT_WINDOW_MS);
  return { deadline, remainingMs: Math.max(0, deadline.getTime() - now.getTime()) };
}

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
