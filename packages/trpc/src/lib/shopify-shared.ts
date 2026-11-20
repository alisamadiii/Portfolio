import { createHmac, timingSafeEqual } from "crypto";

import type { OrderStatusGroup } from "./uber-eats-shared";

// ─── Shopify app: pure helpers (no I/O, unit-tested) ─────────────

/** Admin API version every call is pinned to. Shopify supports each for a year. */
export const SHOPIFY_API_VERSION = "2026-10";

/**
 * Everything the hub asks for at connect. No customer scopes and no protected
 * customer data: orders are shown without names, emails or addresses.
 */
export const SHOPIFY_SCOPES = [
  "read_orders",
  "write_orders",
  "read_products",
  "write_products",
  "read_inventory",
  "write_inventory",
  "read_locations",
  "read_merchant_managed_fulfillment_orders",
  "write_merchant_managed_fulfillment_orders",
].join(",");

const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

/**
 * "acme", "acme.myshopify.com" or "https://acme.myshopify.com/admin" →
 * "acme.myshopify.com". Null for anything else: the anchored check stops
 * "acme.myshopify.com.evil.com" from passing.
 */
export function normalizeShop(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "").replace(/[/?#].*$/, "");
  if (!s.includes(".")) s = `${s}.myshopify.com`;
  return SHOP_RE.test(s) ? s : null;
}

// ─── Signed OAuth state ──────────────────────────────────────────

const safeEqual = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

const fromB64url = (s: string) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export type ShopifyState = { projectId: string; userId: string; shop: string; exp: number };

const STATE_TTL_SECONDS = 30 * 60;

/** Signed connect state (project + user + shop), carried through Shopify's authorize URL. */
export function signShopifyState(
  data: { projectId: string; userId: string; shop: string },
  secret: string,
  now = Date.now()
): string {
  const payload: ShopifyState = { ...data, exp: Math.floor(now / 1000) + STATE_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(`shopify:${body}`).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyShopifyState(token: string, secret: string, now = Date.now()): ShopifyState | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !secret) return null;
  const expected = createHmac("sha256", secret).update(`shopify:${body}`).digest();
  if (!safeEqual(fromB64url(sig), expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ShopifyState;
    if (!data.projectId || !data.userId || !data.shop || data.exp * 1000 < now) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Signatures ──────────────────────────────────────────────────

/**
 * Shopify signs the install and callback query strings: every param except
 * `hmac`, sorted, joined as k=v with &, HMAC-SHA256 with the client secret, hex.
 */
export function verifyShopifyQueryHmac(params: URLSearchParams, secret: string): boolean {
  const given = params.get("hmac");
  if (!given || !secret || !/^[0-9a-f]+$/i.test(given)) return false;
  const message = [...params.entries()]
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const expected = createHmac("sha256", secret).update(message).digest();
  return safeEqual(Buffer.from(given.toLowerCase(), "hex"), expected);
}

/** X-Shopify-Hmac-Sha256: base64 HMAC-SHA256 of the raw body, keyed with the client secret. */
export function verifyShopifyWebhook(
  rawBody: string,
  signature: string | null | undefined,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  return safeEqual(Buffer.from(signature.trim(), "base64"), expected);
}

// ─── Orders ──────────────────────────────────────────────────────

export type ShopifyMoney = { amount: string; currencyCode: string };

/** "12.50" → 1250. Null when Shopify sent nothing. */
export const toCents = (money: { amount: string } | null | undefined): number | null => {
  if (!money) return null;
  const n = Number(money.amount);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

export const toAmount = (cents: number) => (cents / 100).toFixed(2);

/** The fields orderStatusGroup and the labels read off an order. */
export type ShopifyOrderStatus = {
  cancelledAt: string | null;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string;
};

/** Same three buckets as the delivery apps: open = still to ship, completed = shipped, canceled = cancelled or fully refunded. */
export const orderStatusGroup = (o: ShopifyOrderStatus): OrderStatusGroup => {
  if (o.cancelledAt || o.displayFinancialStatus === "REFUNDED" || o.displayFinancialStatus === "VOIDED") return "canceled";
  if (o.displayFulfillmentStatus === "FULFILLED") return "completed";
  return "open";
};

/** Shopify order search for the Orders filters (status bucket + range start). */
export function orderSearch({
  status,
  since,
  text,
}: {
  status?: OrderStatusGroup;
  since?: Date;
  text?: string;
}): string {
  const parts: string[] = [];
  if (status === "open") parts.push("-status:cancelled", "(fulfillment_status:unshipped OR fulfillment_status:partial)");
  if (status === "completed") parts.push("-status:cancelled", "fulfillment_status:shipped");
  if (status === "canceled") parts.push("status:cancelled");
  if (since) parts.push(`created_at:>='${since.toISOString()}'`);
  const q = text?.trim().replace(/['"\\]/g, "");
  if (q) parts.push(/^#?\d+$/.test(q) ? `name:${q.startsWith("#") ? q : `#${q}`}` : `'${q}'`);
  return parts.join(" ");
}

/** "gid://shopify/Order/123" → "123"; anything else passes through. */
export const gidTail = (gid: string) => gid.slice(gid.lastIndexOf("/") + 1);

export const orderGid = (id: string) => (id.startsWith("gid://") ? id : `gid://shopify/Order/${id}`);
