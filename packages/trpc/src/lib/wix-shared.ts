import { createHmac, timingSafeEqual } from "crypto";

// ─── Wix app: pure helpers (no I/O, unit-tested) ─────────────────

/** Wix-built apps the hub knows how to show, by appDefId. */
export const WIX_APPS: Record<string, { key: WixAppKey; name: string }> = {
  "14bcded7-0066-7c35-14d7-466cb3f09103": { key: "blog", name: "Blog" },
  "215238eb-22a5-4c36-9e7b-e7c08025e04e": { key: "stores", name: "Stores" },
  "13d21c63-b5ec-5912-8397-c3a5ddb27a97": { key: "bookings", name: "Bookings" },
  "225dd912-7dea-4738-8688-4b8c6955ffc2": { key: "forms", name: "Forms" },
  "140603ad-af8d-84a5-2c80-a0f60cb47351": { key: "events", name: "Events" },
  "e593b0bd-b783-45b8-97c2-873d42aacaf4": { key: "cms", name: "CMS" },
  "1522827f-c56c-a5c9-2ac9-00f9e6ae12d3": { key: "pricing-plans", name: "Pricing Plans" },
  "14d84998-ae09-1abf-c6fc-3f3cace5bf19": { key: "multilingual", name: "Multilingual" },
  "f9c07de2-5341-40c6-b096-8eb39de391fb": { key: "reservations", name: "Table Reservations" },
};

export type WixAppKey =
  | "blog"
  | "stores"
  | "bookings"
  | "forms"
  | "events"
  | "cms"
  | "pricing-plans"
  | "multilingual"
  | "reservations";

const fromB64url = (s: string) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const safeEqual = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

export type WixInstance = {
  instanceId: string;
  appDefId?: string;
  siteOwnerId?: string;
};

/**
 * Verifies Wix's signed app instance (`<b64url HMAC-SHA256(payload)>.<payload>`,
 * keyed with the app secret) and returns its data, or null when forged.
 */
export function verifySignedInstance(signed: string, secret: string): WixInstance | null {
  const [sig, payload] = signed.split(".");
  if (!sig || !payload || !secret) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  if (!safeEqual(fromB64url(sig), expected)) return null;
  try {
    const data = JSON.parse(fromB64url(payload).toString("utf8")) as WixInstance;
    return typeof data.instanceId === "string" ? data : null;
  } catch {
    return null;
  }
}

export type WixState = { projectId: string; userId: string; exp: number };

const STATE_TTL_SECONDS = 30 * 60;

/** Signed install state (project + user), carried through Wix's installer. */
export function signWixState(
  data: { projectId: string; userId: string },
  secret: string,
  now = Date.now()
): string {
  const payload: WixState = { ...data, exp: Math.floor(now / 1000) + STATE_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(`wix:${body}`).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyWixState(token: string, secret: string, now = Date.now()): WixState | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !secret) return null;
  const expected = createHmac("sha256", secret).update(`wix:${body}`).digest();
  if (!safeEqual(fromB64url(sig), expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as WixState;
    if (!data.projectId || !data.userId || data.exp * 1000 < now) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Form submission → lead ──────────────────────────────────────

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const str = (v: unknown): string => {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(", ");
  if (typeof v === "object") return "";
  return String(v).trim();
};

/**
 * Splits a Wix form submission's answers (field key → value) into lead
 * columns: name (or first + last), email, phone, message, and the rest.
 */
export function submissionToLead(answers: Record<string, unknown>) {
  let first = "";
  let last = "";
  let name = "";
  let email = "";
  let phone = "";
  let message = "";
  const rest: Record<string, string> = {};

  for (const [key, raw] of Object.entries(answers)) {
    const value = str(raw);
    if (!value) continue;
    const k = key.toLowerCase().replace(/[\s-]+/g, "_");
    // Wix field keys often carry a suffix ("first_name_a1b2", "email_3c4d").
    if (!first && /first_?name/.test(k)) first = value;
    else if (!last && /last_?name/.test(k)) last = value;
    else if (!name && /^(full_?|your_?)?name(_|$)/.test(k)) name = value;
    else if (!email && k.includes("email") && looksLikeEmail(value)) email = value;
    else if (!phone && /phone|tel|mobile/.test(k)) phone = value;
    else if (!message && /message|comment|details|description|note/.test(k)) message = value;
    else rest[key] = value;
  }

  return {
    name: name || [first, last].filter(Boolean).join(" ") || null,
    email: email || null,
    phone: phone || null,
    message: message || null,
    rest,
  };
}

// ─── Blog body editing ───────────────────────────────────────────

// Ricos nodes that survive a Markdown round trip. A post with anything else
// (images, galleries, videos, embeds…) keeps its body untouched in the hub.
const MARKDOWN_SAFE_NODES = new Set([
  "PARAGRAPH",
  "TEXT",
  "HEADING",
  "BULLETED_LIST",
  "ORDERED_LIST",
  "LIST_ITEM",
  "BLOCKQUOTE",
  "CODE_BLOCK",
  "DIVIDER",
]);

type RicosNode = { type?: string; nodes?: RicosNode[] };

export function isMarkdownSafe(nodes: RicosNode[] | undefined): boolean {
  return (nodes ?? []).every(
    (n) => !n.type || (MARKDOWN_SAFE_NODES.has(n.type) && isMarkdownSafe(n.nodes))
  );
}

export const RICOS_MARKDOWN_PLUGINS = ["HEADING", "LINK", "CODE_BLOCK", "DIVIDER"];
