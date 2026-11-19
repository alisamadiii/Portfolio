import { createHmac, timingSafeEqual } from "crypto";

import type { DoorDashCandidate, DoorDashOnboardingStatus } from "@workspace/drizzle/schema";

import { ONBOARDING_STATUSES } from "./doordash-constants";

// ─── DoorDash app: pure helpers (no I/O, unit-tested) ────────────

export type DoorDashEnv = "sandbox" | "production";

/**
 * DoorDash has one API host for sandbox and production; the access key decides
 * which one you're in. `overrides` point both at a local stand-in.
 */
export const doordashHosts = (overrides?: { auth?: string | null; api?: string | null }) => ({
  auth: overrides?.auth?.replace(/\/$/, "") || "https://identity.doordash.com",
  api: overrides?.api?.replace(/\/$/, "") || "https://openapi.doordash.com",
});

export const doordashEnv = (env: string | undefined): DoorDashEnv =>
  env === "production" ? "production" : "sandbox";

const b64url = (value: string | Buffer) =>
  (typeof value === "string" ? Buffer.from(value) : value).toString("base64url");

const fromB64url = (s: string) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const safeEqual = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

// ─── Partner JWT ─────────────────────────────────────────────────

export type DoorDashKey = { developerId: string; keyId: string; signingSecret: string };

/** DoorDash caps a token at 30 minutes past `iat`. */
export const JWT_MAX_TTL_SECONDS = 30 * 60;

/**
 * The agency's own credential on every call: HS256 over a DoorDash-flavoured
 * header, keyed with the portal's signing secret (base64url text; Node's
 * base64 decoder takes both alphabets).
 */
export function mintPartnerJwt(key: DoorDashKey, now = Date.now(), ttlSeconds = 5 * 60) {
  const iat = Math.floor(now / 1000);
  const exp = iat + Math.min(ttlSeconds, JWT_MAX_TTL_SECONDS);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT", "dd-ver": "DD-JWT-V1" }));
  const payload = b64url(JSON.stringify({ aud: "doordash", iss: key.developerId, kid: key.keyId, iat, exp }));
  const sig = createHmac("sha256", Buffer.from(key.signingSecret, "base64"))
    .update(`${header}.${payload}`)
    .digest("base64url");
  return { token: `${header}.${payload}.${sig}`, exp: exp * 1000 };
}

// ─── Signed OAuth state ──────────────────────────────────────────

export type DoorDashState = { projectId: string; userId: string; restart?: boolean; exp: number };

const STATE_TTL_SECONDS = 30 * 60;

/** Signed connect state (project + user), carried through DoorDash's authorize URL. */
export function signDoorDashState(
  data: { projectId: string; userId: string; restart?: boolean },
  secret: string,
  now = Date.now()
): string {
  const payload: DoorDashState = {
    projectId: data.projectId,
    userId: data.userId,
    ...(data.restart ? { restart: true } : {}),
    exp: Math.floor(now / 1000) + STATE_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(`doordash:${body}`).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyDoorDashState(token: string, secret: string, now = Date.now()): DoorDashState | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !secret) return null;
  const expected = createHmac("sha256", secret).update(`doordash:${body}`).digest();
  if (!safeEqual(fromB64url(sig), expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DoorDashState;
    if (!data.projectId || !data.userId || data.exp * 1000 < now) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Webhooks ────────────────────────────────────────────────────

/**
 * The Developer Portal takes one "Auth token" per webhook subscription and
 * sends it back on each call. The header it uses isn't documented, so both
 * `Authorization: Bearer <token>` and a bare `Authorization: <token>` pass.
 */
export function verifyDoorDashWebhookToken(
  headers: { get(name: string): string | null },
  expected: string
): boolean {
  if (!expected) return false;
  const raw = headers.get("authorization")?.trim();
  if (!raw) return false;
  const given = raw.replace(/^Bearer\s+/i, "").trim();
  return safeEqual(Buffer.from(given), Buffer.from(expected));
}

export type DoorDashOnboardingEvent = {
  onboarding_id?: string;
  location_id?: string;
  doordash_store_uuid?: string;
  status?: string;
  exclusion_code?: string | null;
  details?: string | null;
  menus?: Array<{ menu_uuid?: string; menu_preview_link?: string | null; menu_error?: string | null }>;
};

export const onboardingStatus = (value: string | undefined | null): DoorDashOnboardingStatus =>
  ONBOARDING_STATUSES.find((s) => s === value?.toUpperCase()) ?? "PENDING";

/** Store columns from one onboarding status payload (webhook or GET). */
export function onboardingUpdate(event: DoorDashOnboardingEvent, now = new Date()) {
  const status = onboardingStatus(event.status);
  const preview = event.menus?.find((m) => m.menu_preview_link)?.menu_preview_link ?? null;
  const menuError = event.menus?.find((m) => m.menu_error)?.menu_error ?? null;
  return {
    onboardingStatus: status,
    exclusionCode: event.exclusion_code?.trim() || null,
    statusDetails: event.details?.trim() || menuError?.trim() || null,
    menuPreviewUrl: preview?.trim() || null,
    lastEventAt: now,
  };
}

// ─── Store candidates ────────────────────────────────────────────

export type DoorDashAddress = {
  street?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  postal_code?: string;
  country?: string;
};

export type DoorDashCandidateRaw = {
  doordash_store_uuid?: string;
  store_uuid?: string;
  name?: string;
  store_name?: string;
  address?: string | DoorDashAddress | null;
  is_eligible_to_onboard?: boolean;
  business_id?: string | number;
  business_name?: string;
  business?: { id?: string | number; name?: string };
};

/** One line of address for the store picker. */
export function candidateAddress(address: DoorDashCandidateRaw["address"]): string | null {
  if (!address) return null;
  if (typeof address === "string") return address.trim() || null;
  const street = [address.street ?? address.address_line_1, address.address_line_2].filter(Boolean).join(", ");
  const town = [address.city, [address.state, address.zip_code ?? address.postal_code].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [street, town].filter(Boolean).join(", ") || null;
}

/** The picker row from one store_candidates entry; null when it has no id. */
export function mapCandidate(raw: DoorDashCandidateRaw): DoorDashCandidate | null {
  const storeId = (raw.doordash_store_uuid ?? raw.store_uuid)?.trim();
  if (!storeId) return null;
  const businessId = raw.business?.id ?? raw.business_id;
  return {
    storeId,
    name: (raw.name ?? raw.store_name)?.trim() || "DoorDash store",
    address: candidateAddress(raw.address),
    eligible: raw.is_eligible_to_onboard !== false,
    businessId: businessId == null ? null : String(businessId),
    businessName: (raw.business?.name ?? raw.business_name)?.trim() || null,
  };
}
