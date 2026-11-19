import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

import type {
  GrubhubFulfillment,
  GrubhubOrderItem,
  GrubhubOrderStatus,
  GrubhubScheduling,
} from "@workspace/drizzle/schema";

import {
  CANCEL_CODES,
  CANCEL_REASONS,
  CONFIRM_WINDOW_MS,
  FULFILLMENT_LABELS,
  INTEGRATION_META,
  NEW_ORDER_STATUSES,
  OPEN_ORDER_STATUSES,
  ORDER_STATUS_GROUPS,
  ORDER_STATUSES,
  REJECT_CODES,
  REJECT_REASONS,
  SOLD_ORDER_STATUSES,
  STATUS_META,
  WAIT_TIME_CHOICES,
  orderStatusGroup,
  type CancelCode,
  type OrderStatusGroup,
  type RejectCode,
  type WaitTimeChoice,
} from "./grubhub-constants";
import { localDateIn, localDayStart, nextMidnightIn } from "./uber-eats-shared";

export {
  CANCEL_CODES,
  CANCEL_REASONS,
  CONFIRM_WINDOW_MS,
  FULFILLMENT_LABELS,
  INTEGRATION_META,
  NEW_ORDER_STATUSES,
  OPEN_ORDER_STATUSES,
  ORDER_STATUS_GROUPS,
  ORDER_STATUSES,
  REJECT_CODES,
  REJECT_REASONS,
  SOLD_ORDER_STATUSES,
  STATUS_META,
  WAIT_TIME_CHOICES,
  localDateIn,
  localDayStart,
  nextMidnightIn,
  orderStatusGroup,
  type CancelCode,
  type OrderStatusGroup,
  type RejectCode,
  type WaitTimeChoice,
};

// ─── Grubhub Marketplace API: pure helpers (no I/O, unit-tested) ─

export type GrubhubEnv = "preprod" | "production";

/** Preprod and production are separate hosts with separate credentials. `override` points at a local stand-in. */
export const grubhubHosts = (env: string | undefined, override?: string | null) => ({
  api:
    override?.replace(/\/$/, "") ||
    (env === "production" ? "https://api-third-party-gtm.grubhub.com" : "https://api-third-party-gtm-pp.grubhub.com"),
});

export const grubhubEnv = (env: string | undefined): GrubhubEnv =>
  env === "production" ? "production" : "preprod";

const safeEqual = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

// ─── Request signing (the "MAC" Authorization header) ─────────────
// Every partner call carries X-GH-PARTNER-KEY plus
//   Authorization: MAC id="<client id>",nonce="<nonce>",bodyhash="<b64 sha256 body>",mac="<b64 hmac>"
// where the HMAC-SHA256 (keyed with the secret) covers a normalized string of
// nonce, method, request URI, host, port, body hash and ext, each ending in
// "\n". bodyhash is left out of the header (and empty in the string) for
// calls without a body. This is Grubhub's flavour of the OAuth 2.0 MAC draft.

export type GrubhubCredentials = { clientId: string; secret: string };

export const bodyHash = (body: string) => createHash("sha256").update(body, "utf8").digest("base64");

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const randomAlnum = (length = 8) => {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALNUM[bytes[i]! % ALNUM.length];
  return out;
};

/** Grubhub's convention: seconds since the credential's issue date, a colon, random letters. */
export const macNonce = (issueDate: Date, now = new Date(), random = randomAlnum()) =>
  `${Math.max(0, Math.floor((now.getTime() - issueDate.getTime()) / 1000))}:${random}`;

export type MacParts = {
  nonce: string;
  method: string;
  /** Path plus query string, e.g. "/pos/v1/merchant/123/orders?status=CONFIRMED". */
  requestUri: string;
  host: string;
  port: number | string;
  bodyhash: string;
  ext?: string;
};

/** The exact string Grubhub signs: seven fields, each followed by a newline. */
export const macNormalizedString = ({ nonce, method, requestUri, host, port, bodyhash, ext = "" }: MacParts) =>
  `${nonce}\n${method.toUpperCase()}\n${requestUri}\n${host.toLowerCase()}\n${port}\n${bodyhash}\n${ext}\n`;

export const macSignature = (secret: string, normalized: string) =>
  createHmac("sha256", secret).update(normalized, "utf8").digest("base64");

export const macHeaderValue = (parts: { id: string; nonce: string; bodyhash?: string | null; ext?: string | null; mac: string }) => {
  let value = `MAC id="${parts.id}",nonce="${parts.nonce}"`;
  if (parts.bodyhash) value += `,bodyhash="${parts.bodyhash}"`;
  if (parts.ext) value += `,ext="${parts.ext}"`;
  return `${value},mac="${parts.mac}"`;
};

/** Signs one request. `body` must be the exact string that goes on the wire. */
export function signGrubhubRequest(
  creds: GrubhubCredentials,
  req: { method: string; url: URL; body?: string | null; nonce: string }
) {
  const hash = req.body ? bodyHash(req.body) : "";
  const port = req.url.port || (req.url.protocol === "http:" ? "80" : "443");
  const normalized = macNormalizedString({
    nonce: req.nonce,
    method: req.method,
    requestUri: `${req.url.pathname}${req.url.search}`,
    host: req.url.hostname,
    port,
    bodyhash: hash,
  });
  const mac = macSignature(creds.secret, normalized);
  return {
    authorization: macHeaderValue({ id: creds.clientId, nonce: req.nonce, bodyhash: hash || null, mac }),
    normalized,
    bodyhash: hash || null,
    mac,
  };
}

/** The MAC header back into its parts (the mock server and tests use it). */
export function parseMacHeader(header: string | null | undefined) {
  if (!header) return null;
  const m = /^MAC\s+(.+)$/i.exec(header.trim());
  if (!m) return null;
  const parts: Record<string, string> = {};
  for (const pair of m[1]!.matchAll(/(\w+)="([^"]*)"/g)) parts[pair[1]!] = pair[2]!;
  if (!parts.id || !parts.nonce || !parts.mac) return null;
  return { id: parts.id, nonce: parts.nonce, bodyhash: parts.bodyhash ?? null, ext: parts.ext ?? null, mac: parts.mac };
}

/** Request headers for one signed call. */
export function grubhubHeaders(
  partnerKey: string,
  creds: GrubhubCredentials,
  req: { method: string; url: URL; body?: string | null; nonce: string }
): Record<string, string> {
  const { authorization } = signGrubhubRequest(creds, req);
  return {
    "X-GH-PARTNER-KEY": partnerKey,
    Authorization: authorization,
    Accept: "application/json",
    ...(req.body ? { "Content-Type": "application/json" } : {}),
  };
}

// ─── Webhooks ────────────────────────────────────────────────────
// Grubhub registers our one webhook URL by hand and calls it with the Basic
// credentials we give them. Which webhook it is shows in the body's shape.

export function verifyBasicAuth(header: string | null | undefined, user: string, password: string): boolean {
  if (!header || !user || !password) return false;
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/.exec(header.trim());
  if (!m) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(m[1]!, "base64").toString("utf8");
  } catch {
    return false;
  }
  const colon = decoded.indexOf(":");
  if (colon < 0) return false;
  const givenUser = Buffer.from(decoded.slice(0, colon));
  const givenPass = Buffer.from(decoded.slice(colon + 1));
  const userOk = safeEqual(givenUser, Buffer.from(user));
  const passOk = safeEqual(givenPass, Buffer.from(password));
  return userOk && passOk;
}

export type ActivationResult = {
  merchantId: string;
  status: string;
  reasonCode: string | null;
  reasonMessage: string | null;
  liveDate: Date | null;
};

export type GrubhubWebhook =
  | { kind: "order"; order: PosOrder }
  | { kind: "activation"; jobId: string | null; overallStatus: string | null; results: ActivationResult[] }
  | {
      kind: "availability";
      merchantId: string;
      status: string;
      fulfillment: string | null;
      endTime: Date | null;
      reason: string | null;
    }
  | { kind: "merchant_config"; merchantIds: string[] }
  | { kind: "menu_ingestion"; jobId: string | null; status: string | null }
  | { kind: "unknown"; keys: string[] };

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const str = (x: unknown): string | null => (typeof x === "string" && x.trim() ? x.trim() : typeof x === "number" ? String(x) : null);

/** Which Grubhub webhook a body is. Unknown shapes are reported, never guessed. */
export function classifyWebhook(body: unknown): GrubhubWebhook {
  if (!isRecord(body)) return { kind: "unknown", keys: [] };
  const keys = Object.keys(body);
  if (typeof body.uuid === "string" && typeof body.status === "string" && ("charges" in body || "diners" in body || "time_placed" in body)) {
    return { kind: "order", order: body as unknown as PosOrder };
  }
  if ("activation_job_id" in body || Array.isArray(body.activation_results)) {
    const results = Array.isArray(body.activation_results) ? body.activation_results : [];
    return {
      kind: "activation",
      jobId: str(body.activation_job_id),
      overallStatus: str(body.overall_status),
      results: results.filter(isRecord).flatMap((r) => {
        const merchantId = str(r.merchant_id);
        if (!merchantId) return [];
        return [
          {
            merchantId,
            status: str(r.status) ?? "UNKNOWN",
            reasonCode: str(r.reason_code),
            reasonMessage: str(r.reason_message),
            liveDate: parseInstant(r.live_date),
          },
        ];
      }),
    };
  }
  const merchantId = str(body.merchant_id);
  if (merchantId && typeof body.status === "string" && /^(ONLINE|OFFLINE)$/i.test(body.status)) {
    return {
      kind: "availability",
      merchantId,
      status: body.status.toUpperCase(),
      fulfillment: str(body.name),
      endTime: parseInstant(body.end_time),
      reason: str(body.reason),
    };
  }
  if ("job_id" in body && !("merchant_id" in body)) {
    return { kind: "menu_ingestion", jobId: str(body.job_id), status: str(body.status) };
  }
  const list = Array.isArray(body.merchant_ids) ? body.merchant_ids : Array.isArray(body.merchants) ? body.merchants : null;
  if (list) {
    const ids = list.map((m) => (isRecord(m) ? str(m.merchant_id ?? m.cust_id) : str(m))).filter((x): x is string => !!x);
    if (ids.length) return { kind: "merchant_config", merchantIds: ids };
  }
  if (merchantId && ("configuration" in body || "configured" in body || "config" in body)) {
    return { kind: "merchant_config", merchantIds: [merchantId] };
  }
  return { kind: "unknown", keys };
}

// ─── Merchant ────────────────────────────────────────────────────

export type PosMerchantData = {
  merchant_id?: string | number;
  merchant_uuid?: string;
  name?: string;
  address?: {
    street_address?: string;
    street_address2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    time_zone?: string;
  };
  account_status?: {
    merchant_status?: string;
    merchant_status_descriptor?: string;
    pos_merchant_status?: string;
    accepting_online_orders?: boolean;
    reason?: string;
  };
  merchant_status_by_order_type?: Record<string, string>;
  service_type?: string;
};

/** One line of address for the store card. */
export function merchantAddress(address: PosMerchantData["address"] | undefined): string | null {
  if (!address) return null;
  const street = [address.street_address, address.street_address2].filter(Boolean).join(", ");
  const town = [address.locality, [address.region, address.postal_code].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [street, town].filter(Boolean).join(", ") || null;
}

/** Store columns from GET /pos/v1/merchant/{id}. Unknown values read as null, never invented. */
export function mapMerchant(m: PosMerchantData) {
  const pos = m.account_status?.pos_merchant_status?.toUpperCase();
  return {
    merchantId: String(m.merchant_id ?? ""),
    merchantUuid: m.merchant_uuid ?? null,
    name: m.name?.trim() || "Grubhub restaurant",
    address: merchantAddress(m.address),
    city: m.address?.locality ?? null,
    state: m.address?.region ?? null,
    postalCode: m.address?.postal_code ?? null,
    timezone: m.address?.time_zone?.trim() || null,
    accountStatus: m.account_status?.merchant_status?.trim() || null,
    acceptingOnlineOrders:
      typeof m.account_status?.accepting_online_orders === "boolean" ? m.account_status.accepting_online_orders : null,
    posStatus: (pos === "ONLINE" || pos === "OFFLINE" ? pos : null) as "ONLINE" | "OFFLINE" | null,
  };
}

// ─── Orders ──────────────────────────────────────────────────────

/** Grubhub types instants as Joda objects in the spec but sends ISO strings; both are read. */
export type Instant = string | number | { millis?: number; iso?: string } | null | undefined;

export function parseInstant(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? new Date(value) : null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (isRecord(value)) {
    if (typeof value.millis === "number") return new Date(value.millis);
    if (typeof value.iso === "string") return parseInstant(value.iso);
  }
  return null;
}

export const timezoneId = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : isRecord(value) && typeof value.id === "string" ? value.id : null;

export type ContactInfo = { phone?: string | null; name?: string | null; email?: string | null };
export type OrderAddress = {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  cross_streets?: string;
  company_name?: string;
};
export type LineOption = {
  label?: string;
  name?: string;
  price?: number | null;
  quantity?: number | null;
  line_sub_options?: LineOption[];
};
export type Line = {
  name?: string;
  quantity?: number;
  price?: number | null;
  merchant_price?: number | null;
  total?: number | null;
  merchant_total?: number | null;
  diner_total?: number | null;
  special_instructions?: string | null;
  line_options?: LineOption[];
  external_id?: string | null;
};
export type Charges = {
  fees?: { total?: number | null; delivery?: number | null };
  taxes?: { total?: number | null; merchant_total?: number | null };
  tip?: { amount?: number | null; type?: string };
  diner_grand_total?: number | null;
  grand_total?: number | null;
  line_groups?: { label?: string; lines?: Line[] }[];
  coupons?: { text?: string; amount?: number | null }[];
  merchant_total?: number | null;
  merchant_subtotal?: number | null;
  merchant_subtotal_before_coupons?: number | null;
};
export type PosOrder = {
  uuid: string;
  order_number?: string | null;
  merchant_id?: string | number | null;
  order_merchant_id?: string | null;
  status?: string;
  statusHistory?: { status?: string; timestamp?: Instant; update_source?: string; reason?: string }[];
  time_placed?: Instant;
  when_for?: Instant;
  fulfillment_scheduling?: string;
  order_type?: string;
  is_test?: boolean;
  restaurant_timezone_id?: unknown;
  external_order_id?: string | null;
  fulfillment_info?: {
    pickup_info?: { name?: string; contact_info?: ContactInfo; instructions?: string; estimated_pickup_time?: Instant };
    delivery_info?: {
      address?: OrderAddress;
      contact_info?: ContactInfo;
      instruction?: string;
      is_managed_delivery?: boolean;
      estimated_delivery_time?: Instant;
      managed_delivery_estimated_pickup?: Instant;
    };
  };
  diners?: { diner_info?: ContactInfo; charges?: Charges; participation?: string }[];
  charges?: Charges;
};

export const orderStatus = (value: string | undefined): GrubhubOrderStatus =>
  ORDER_STATUSES.find((s) => s === value?.toUpperCase()) ?? "UNKNOWN";

export function orderFulfillment(order: Pick<PosOrder, "fulfillment_info">): GrubhubFulfillment {
  const info = order.fulfillment_info;
  if (info?.delivery_info) return info.delivery_info.is_managed_delivery === true ? "GRUBHUB_DELIVERY" : "SELF_DELIVERY";
  if (info?.pickup_info) return "PICKUP";
  return "UNKNOWN";
}

export const orderScheduling = (value: string | undefined): GrubhubScheduling =>
  value?.toUpperCase() === "ASAP" ? "ASAP" : value?.toUpperCase() === "FUTURE" ? "FUTURE" : "UNKNOWN";

const cents = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;

const qty = (value: unknown) => Math.max(1, Math.round(typeof value === "number" && Number.isFinite(value) ? value : 1));

/** Every line of the order. Group orders split lines per diner; single orders keep them at the top. */
export function rawLines(order: PosOrder): Line[] {
  const top = (order.charges?.line_groups ?? []).flatMap((g) => g.lines ?? []);
  if (top.length) return top;
  return (order.diners ?? []).flatMap((d) => (d.charges?.line_groups ?? []).flatMap((g) => g.lines ?? []));
}

export type OrderLineOption = { group: string; items: { title: string; quantity: number; priceCents: number | null }[] };

const flattenOptions = (options: LineOption[] | undefined, prefix = ""): OrderLineOption[] => {
  const out: OrderLineOption[] = [];
  const byGroup = new Map<string, OrderLineOption["items"]>();
  for (const o of options ?? []) {
    const group = [prefix, o.label?.trim() || "Options"].filter(Boolean).join(" › ");
    const items = byGroup.get(group) ?? [];
    items.push({ title: o.name?.trim() || "Option", quantity: qty(o.quantity), priceCents: cents(o.price) });
    byGroup.set(group, items);
  }
  for (const [group, items] of byGroup) out.push({ group, items });
  for (const o of options ?? []) {
    if (o.line_sub_options?.length) out.push(...flattenOptions(o.line_sub_options, o.name?.trim() || prefix));
  }
  return out;
};

/** When the order moved through each status, from Grubhub's history. */
export function statusTimes(history: PosOrder["statusHistory"]) {
  const at = (...statuses: string[]) => {
    const hits = (history ?? [])
      .filter((h) => statuses.includes(h.status?.toUpperCase() ?? ""))
      .map((h) => parseInstant(h.timestamp))
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());
    return hits[0] ?? null;
  };
  return {
    confirmedAt: at("CONFIRMED"),
    readyAt: at("PICKUP_READY", "OUT_FOR_DELIVERY"),
    fulfilledAt: at("FULFILLED"),
    closedAt: at("CANCELLED", "REJECTED", "STALE"),
  };
}

export const dinerOf = (order: PosOrder): ContactInfo | null =>
  order.diners?.find((d) => d.participation === "HOST")?.diner_info ??
  order.diners?.[0]?.diner_info ??
  order.fulfillment_info?.pickup_info?.contact_info ??
  order.fulfillment_info?.delivery_info?.contact_info ??
  null;

/** Order columns from a Grubhub order (webhook body or GET). */
export function mapOrder(order: PosOrder) {
  const lines = rawLines(order);
  const items: GrubhubOrderItem[] = lines.map((l) => ({ title: l.name?.trim() || "Item", quantity: qty(l.quantity) }));
  const charges = order.charges ?? order.diners?.[0]?.charges;
  const times = statusTimes(order.statusHistory);
  return {
    id: order.uuid,
    merchantId: order.merchant_id != null ? String(order.merchant_id) : null,
    orderNumber: order.order_number?.trim() || order.uuid.slice(-5).toUpperCase(),
    status: orderStatus(order.status),
    fulfillment: orderFulfillment(order),
    scheduling: orderScheduling(order.fulfillment_scheduling),
    isTest: order.is_test === true,
    placedAt: parseInstant(order.time_placed) ?? new Date(),
    whenFor: parseInstant(order.when_for),
    dinerName: dinerOf(order)?.name?.trim() || null,
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    merchantSubtotalCents: cents(charges?.merchant_subtotal),
    taxCents: cents(charges?.taxes?.total),
    tipCents: cents(charges?.tip?.amount),
    feesCents: cents(charges?.fees?.total),
    merchantTotalCents: cents(charges?.merchant_total),
    grandTotalCents: cents(charges?.grand_total),
    dinerGrandTotalCents: cents(charges?.diner_grand_total),
    ...times,
    externalOrderId: order.external_order_id?.trim() || null,
    timezone: timezoneId(order.restaurant_timezone_id),
  };
}

const addressLine = (a: OrderAddress | undefined): string | null => {
  if (!a) return null;
  const street = [a.address_line1, a.address_line2].filter(Boolean).join(", ");
  const town = [a.city, [a.state, a.zip_code].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [street, town].filter(Boolean).join(", ") || null;
};

/** Everything the order dialog and the receipt show, from the saved payload. */
export function mapOrderDetail(order: PosOrder) {
  const base = mapOrder(order);
  const charges = order.charges ?? order.diners?.[0]?.charges;
  const diner = dinerOf(order);
  const pickup = order.fulfillment_info?.pickup_info;
  const delivery = order.fulfillment_info?.delivery_info;
  const lines = rawLines(order).map((l) => {
    const quantity = qty(l.quantity);
    const unitCents = cents(l.merchant_price ?? l.price);
    return {
      title: l.name?.trim() || "Item",
      quantity,
      unitCents,
      totalCents: cents(l.merchant_total) ?? cents(l.total) ?? (unitCents != null ? unitCents * quantity : null),
      instructions: l.special_instructions?.trim() || null,
      options: flattenOptions(l.line_options),
    };
  });
  const coupons = (charges?.coupons ?? [])
    .map((c) => ({ text: c.text?.trim() || "Coupon", amountCents: cents(c.amount) }))
    .filter((c) => c.amountCents);
  return {
    ...base,
    lines,
    customer: { name: diner?.name?.trim() || null, phone: diner?.phone?.trim() || null },
    pickup:
      base.fulfillment === "PICKUP"
        ? { instructions: pickup?.instructions?.trim() || null, estimatedPickupAt: parseInstant(pickup?.estimated_pickup_time) }
        : null,
    delivery: delivery
      ? {
          isManaged: delivery.is_managed_delivery === true,
          // The restaurant only needs the address when it drives itself.
          address: delivery.is_managed_delivery === true ? null : addressLine(delivery.address),
          instruction: delivery.instruction?.trim() || null,
          estimatedDeliveryAt: parseInstant(delivery.estimated_delivery_time),
          estimatedDriverPickupAt: parseInstant(delivery.managed_delivery_estimated_pickup),
        }
      : null,
    charges: {
      merchantSubtotalCents: base.merchantSubtotalCents,
      taxCents: base.taxCents,
      feesCents: base.feesCents,
      deliveryFeeCents: cents(charges?.fees?.delivery),
      tipCents: base.tipCents,
      coupons,
      merchantTotalCents: base.merchantTotalCents,
      grandTotalCents: base.grandTotalCents,
      dinerGrandTotalCents: base.dinerGrandTotalCents,
    },
  };
}

// ─── State machine ───────────────────────────────────────────────

/** When Grubhub will cancel a still-unconfirmed order, and how long is left (0 when past). */
export function confirmDeadline(placedAt: Date, now = new Date()) {
  const deadline = new Date(placedAt.getTime() + CONFIRM_WINDOW_MS);
  return { deadline, remainingMs: Math.max(0, deadline.getTime() - now.getTime()) };
}

export type OrderActions = {
  confirm: boolean;
  reject: boolean;
  ready: boolean;
  outForDelivery: boolean;
  fulfilled: boolean;
  requestCancel: boolean;
};

/** What the restaurant may do with an order in this state. */
export function allowedActions(status: GrubhubOrderStatus, fulfillment: GrubhubFulfillment): OrderActions {
  const none: OrderActions = { confirm: false, reject: false, ready: false, outForDelivery: false, fulfilled: false, requestCancel: false };
  const self = fulfillment === "SELF_DELIVERY";
  switch (status) {
    case "RESTAURANT_CONFIRMABLE":
      return { ...none, confirm: true, reject: true };
    case "CONFIRMED":
      return { ...none, ready: !self, outForDelivery: self, requestCancel: true };
    case "PICKUP_READY":
      return { ...none, requestCancel: true };
    case "OUT_FOR_DELIVERY":
      return { ...none, fulfilled: self, requestCancel: true };
    default:
      return none;
  }
}

export type StatusAction =
  | { action: "confirm"; waitTimeMinutes?: number | null; externalOrderId?: string | null }
  | { action: "reject"; code: RejectCode; message: string }
  | { action: "ready" }
  | { action: "outForDelivery" }
  | { action: "fulfilled" };

/** The exact PUT .../status body for an action. */
export function statusUpdateBody(input: StatusAction): Record<string, unknown> {
  switch (input.action) {
    case "confirm":
      return {
        status: "CONFIRMED",
        ...(input.waitTimeMinutes ? { wait_time_in_minutes: input.waitTimeMinutes } : {}),
        ...(input.externalOrderId ? { external_order_id: input.externalOrderId } : {}),
      };
    case "reject": {
      const message = input.message.trim();
      if (!message) throw new Error("A reject message is required.");
      return { status: "REJECTED", reason_code: input.code, message };
    }
    case "ready":
      return { status: "PICKUP_READY" };
    case "outForDelivery":
      return { status: "OUT_FOR_DELIVERY" };
    case "fulfilled":
      return { status: "FULFILLED" };
  }
}

/** POST .../changerequests body asking Grubhub Care to cancel a confirmed order. */
export function cancelRequestBody(input: {
  code: CancelCode;
  reason: string;
  agentName: string;
  requestor: { firstName: string; lastName: string; email: string };
}) {
  const label = CANCEL_REASONS.find((r) => r.code === input.code)?.label ?? input.code;
  return {
    change_action: "cancel.action",
    reason_code: input.code,
    reason: input.reason.trim() ? `${label}: ${input.reason.trim()}` : label,
    restaurant_agent_name: input.agentName,
    requestor_first_name: input.requestor.firstName,
    requestor_last_name: input.requestor.lastName,
    requestor_email: input.requestor.email,
  };
}

/** Splits a display name the way the change request wants it. */
export function splitName(name: string | null | undefined, email: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: email.split("@")[0] || "Client", lastName: "Hub" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") || "Hub" };
}

/** Grubhub wants `YYYY-MM-DDTHH:mm:ssZ`, no milliseconds. */
export const grubhubTimestamp = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");

export const ORDERS_WINDOW_MS = 24 * 60 * 60_000;

/** GET /orders requires end within 24 hours of start. */
export const ordersWindow = (now = new Date()) => ({ start: new Date(now.getTime() - ORDERS_WINDOW_MS), end: now });
