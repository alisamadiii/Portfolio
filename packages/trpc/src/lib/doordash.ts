import "server-only";

import { TRPCError } from "@trpc/server";
import { eq, inArray, lt } from "drizzle-orm";

import { readAccountToken } from "@workspace/auth/tokens";
import { db } from "@workspace/drizzle/pool";
import {
  hubDoorDashProvision,
  hubDoorDashStore,
  type DoorDashCandidate,
} from "@workspace/drizzle/schema";

import {
  doordashHosts,
  mapCandidate,
  mintPartnerJwt,
  onboardingUpdate,
  type DoorDashCandidateRaw,
  type DoorDashOnboardingEvent,
} from "./doordash-shared";

// ─── DoorDash Marketplace API, SSIO part (the agency's one integration) ──
// Raw REST, no SDK. Two kinds of credential:
//  - the partner JWT: minted here from the Developer Portal access key
//    (developer id, key id, signing secret), on every call;
//  - the merchant JWT: from the OAuth code, one hour, sent as MxAuthorization
//    on store_candidates and store_onboarding. Kept encrypted for 30 minutes
//    (hub_doordash_provision) while the owner picks a store, then dropped.
// Sandbox and production share the host; the access key decides which one.

const developerId = () => process.env.DOORDASH_DEVELOPER_ID ?? "";
const keyId = () => process.env.DOORDASH_KEY_ID ?? "";
const signingSecret = () => process.env.DOORDASH_SIGNING_SECRET ?? "";
const oauthClientId = () => process.env.DOORDASH_OAUTH_CLIENT_ID ?? "";

export const isDoorDashConfigured = () =>
  Boolean(developerId() && keyId() && signingSecret() && oauthClientId());

// DOORDASH_AUTH_URL / DOORDASH_API_URL: local only, point at a mock server.
const hosts = () =>
  doordashHosts({ auth: process.env.DOORDASH_AUTH_URL, api: process.env.DOORDASH_API_URL });

const USER_AGENT = "ClientHub/1.0";

export const doordashCallbackUrl = () =>
  new URL("/api/doordash/callback", process.env.NEXT_PUBLIC_API_URL).toString();

/** DoorDash's sign-in + consent screen for the merchant. */
export function doordashAuthorizeUrl(state: string) {
  const url = new URL("/auth", hosts().auth);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", doordashCallbackUrl());
  url.searchParams.set("scope", "*");
  url.searchParams.set("state", state);
  url.searchParams.set("client_id", oauthClientId());
  url.searchParams.set("prompt", "none");
  url.searchParams.set("layout", "default");
  return url.toString();
}

export class DoorDashApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

// One partner JWT at a time, re-minted a minute before it expires.
let cached: { token: string; exp: number } | null = null;
const REFRESH_MARGIN_MS = 60_000;

export function partnerJwt(): string {
  if (cached && cached.exp - REFRESH_MARGIN_MS > Date.now()) return cached.token;
  cached = mintPartnerJwt({ developerId: developerId(), keyId: keyId(), signingSecret: signingSecret() });
  return cached.token;
}

export const forgetDoorDashJwt = () => {
  cached = null;
};

async function dd<T>(path: string, init?: RequestInit, merchantJwt?: string): Promise<T> {
  const res = await fetch(`${hosts().api}/marketplace${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${partnerJwt()}`,
      "auth-version": "v2",
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      ...(merchantJwt ? { MxAuthorization: `Bearer ${merchantJwt}` } : {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string; error?: string; detail?: string; code?: string }
      | null;
    throw new DoorDashApiError(
      res.status,
      body?.message ?? body?.error ?? body?.detail ?? body?.code ?? `DoorDash request failed (${res.status})`
    );
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** The merchant's code from the callback → their one-hour token. Codes are single-use. */
export async function exchangeDoorDashCode(code: string) {
  const res = await dd<{ access_token?: string }>("/api/v2/tokens", {
    method: "POST",
    body: JSON.stringify({ exchange_code: code }),
  });
  if (!res?.access_token) throw new DoorDashApiError(502, "DoorDash returned no merchant token");
  return res.access_token;
}

const LIST_KEYS = ["store_candidates", "stores", "candidates", "data", "results"];

/** The docs name the fields of a candidate but not the list's key; take the first array we find. */
const pickList = (res: unknown): DoorDashCandidateRaw[] => {
  if (Array.isArray(res)) return res as DoorDashCandidateRaw[];
  if (!res || typeof res !== "object") return [];
  const obj = res as Record<string, unknown>;
  for (const key of LIST_KEYS) {
    if (Array.isArray(obj[key])) return obj[key] as DoorDashCandidateRaw[];
  }
  return [];
};

const PAGE = 100;

/**
 * Every store the merchant may onboard, eligible or not. A 412 means the
 * signed-in user isn't a business admin for all of them (surfaced as is).
 */
export async function listStoreCandidates(merchantJwt: string): Promise<DoorDashCandidate[]> {
  const out: DoorDashCandidate[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await dd<unknown>(
      `/api/v2/store_candidates?limit=${PAGE}&offset=${page * PAGE}`,
      undefined,
      merchantJwt
    );
    const raw = pickList(res);
    for (const r of raw) {
      const c = mapCandidate(r);
      if (c && !out.some((o) => o.storeId === c.storeId)) out.push(c);
    }
    const total = (res as { total_count?: unknown } | null)?.total_count;
    if (raw.length < PAGE || (typeof total === "number" && out.length >= total)) break;
  }
  return out;
}

/** Asks DoorDash to onboard a store to the hub. 202 + onboarding id; 412 if a job is already open. */
export async function startStoreOnboarding(
  merchantJwt: string,
  input: { storeId: string; locationId: string; name: string; address?: string | null; email?: string | null }
) {
  const res = await dd<{ onboarding_id?: string }>(
    "/api/v2/store_onboarding",
    {
      method: "POST",
      body: JSON.stringify({
        doordash_store_uuid: input.storeId,
        location_id: input.locationId,
        provider_store_name: input.name,
        ...(input.address ? { provider_store_address: input.address } : {}),
        ...(input.email ? { merchant_decision_maker_email: input.email } : {}),
      }),
    },
    merchantJwt
  );
  const id = res?.onboarding_id?.trim();
  if (!id) throw new DoorDashApiError(502, "DoorDash accepted the request but returned no onboarding id");
  return id;
}

export const getStoreOnboarding = (onboardingId: string) =>
  dd<DoorDashOnboardingEvent>(`/api/v2/store_onboarding/${encodeURIComponent(onboardingId)}`);

/** Test environments only: DoorDash forgets the job so it can be started over. */
export const resetStoreOnboarding = (onboardingId: string) =>
  dd<void>(`/api/v2/store_onboarding/${encodeURIComponent(onboardingId)}`, { method: "DELETE" });

// ─── Hub side ────────────────────────────────────────────────────

export const doordashStoreFor = (projectId: string) =>
  db.query.hubDoorDashStore.findFirst({ where: eq(hubDoorDashStore.projectId, projectId) });

/**
 * Saves the picked store and its new onboarding job on the project. A
 * previous job id (reconnect, restart) moves to pastOnboardingIds so its late
 * webhooks are ignored.
 */
export async function bindDoorDashStore(
  projectId: string,
  userId: string | null,
  candidate: DoorDashCandidate,
  onboardingId: string,
  decisionMakerEmail: string | null
) {
  const existing = await doordashStoreFor(projectId);
  const past =
    existing?.onboardingId && existing.onboardingId !== onboardingId
      ? [...existing.pastOnboardingIds, existing.onboardingId]
      : (existing?.pastOnboardingIds ?? []);
  const now = new Date();
  const values = {
    storeId: candidate.storeId,
    businessId: candidate.businessId,
    businessName: candidate.businessName,
    name: candidate.name,
    address: candidate.address,
    onboardingId,
    pastOnboardingIds: past,
    onboardingStatus: "PENDING" as const,
    exclusionCode: null,
    statusDetails: null,
    menuPreviewUrl: null,
    decisionMakerEmail,
    connectedUserId: userId,
    lastEventAt: null,
    lastError: null,
    updatedAt: now,
  };
  await db
    .insert(hubDoorDashStore)
    .values({ projectId, ...values })
    .onConflictDoUpdate({ target: hubDoorDashStore.projectId, set: values });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One onboarding status payload (webhook or GET). Matched by onboarding id
 * first; otherwise by our location id (the project) or the store uuid, in
 * which case DoorDash issued a newer job id and we adopt it. Ids we already
 * retired are ignored. Safe to run twice.
 */
export async function applyOnboardingEvent(event: DoorDashOnboardingEvent) {
  const id = event.onboarding_id?.trim();
  if (!id) return { handled: false as const, reason: "no onboarding id" };
  const update = onboardingUpdate(event);

  const byId = await db.query.hubDoorDashStore.findFirst({ where: eq(hubDoorDashStore.onboardingId, id) });
  if (byId) {
    await db
      .update(hubDoorDashStore)
      .set({ ...update, lastError: null, updatedAt: new Date() })
      .where(eq(hubDoorDashStore.id, byId.id));
    return { handled: true as const, projectId: byId.projectId };
  }

  const location = event.location_id?.trim();
  const storeUuid = event.doordash_store_uuid?.trim();
  const row =
    location && UUID.test(location)
      ? await db.query.hubDoorDashStore.findFirst({ where: eq(hubDoorDashStore.projectId, location) })
      : storeUuid
        ? await db.query.hubDoorDashStore.findFirst({ where: eq(hubDoorDashStore.storeId, storeUuid) })
        : undefined;
  if (!row) return { handled: false as const, reason: "unknown store" };
  if (row.pastOnboardingIds.includes(id)) return { handled: false as const, reason: "stale onboarding id" };

  await db
    .update(hubDoorDashStore)
    .set({
      onboardingId: id,
      pastOnboardingIds: row.onboardingId ? [...row.pastOnboardingIds, row.onboardingId] : row.pastOnboardingIds,
      ...update,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(hubDoorDashStore.id, row.id));
  return { handled: true as const, projectId: row.projectId };
}

/** Re-reads the job from DoorDash and saves it; never throws. */
export async function refreshDoorDashStore(row: { id: string; onboardingId: string | null }) {
  if (!row.onboardingId) return { ok: false as const, error: "No onboarding request yet." };
  try {
    const job = await getStoreOnboarding(row.onboardingId);
    await db
      .update(hubDoorDashStore)
      .set({ ...onboardingUpdate({ ...job, onboarding_id: row.onboardingId }), lastError: null, updatedAt: new Date() })
      .where(eq(hubDoorDashStore.id, row.id));
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "DoorDash status check failed";
    await db
      .update(hubDoorDashStore)
      .set({ lastError: message, updatedAt: new Date() })
      .where(eq(hubDoorDashStore.id, row.id));
    return { ok: false as const, error: message };
  }
}

/** The pending store pick for a project, with the merchant token decrypted. Expired rows are dropped. */
export async function doordashProvisionFor(projectId: string) {
  const row = await db.query.hubDoorDashProvision.findFirst({
    where: eq(hubDoorDashProvision.projectId, projectId),
  });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(hubDoorDashProvision).where(eq(hubDoorDashProvision.projectId, projectId));
    return null;
  }
  const token = await readAccountToken(row.tokenEnc);
  if (!token) return null;
  return { ...row, token };
}

export const clearDoorDashProvision = (projectId: string) =>
  db.delete(hubDoorDashProvision).where(eq(hubDoorDashProvision.projectId, projectId));

/** Deletes every DoorDash row of a project (disconnect, project delete). */
export async function deleteDoorDashRows(projectIds: string[]) {
  if (!projectIds.length) return;
  await db.delete(hubDoorDashStore).where(inArray(hubDoorDashStore.projectId, projectIds));
  await db.delete(hubDoorDashProvision).where(inArray(hubDoorDashProvision.projectId, projectIds));
}

/** Drops provisioning rows nobody finished. */
export const sweepDoorDashProvisions = () =>
  db.delete(hubDoorDashProvision).where(lt(hubDoorDashProvision.expiresAt, new Date()));

/** A DoorDash HTTP failure as a tRPC error the hub can show. */
export function toTRPC(error: unknown, fallback: string) {
  if (error instanceof TRPCError) return error;
  if (error instanceof DoorDashApiError) {
    const code =
      error.status === 401 || error.status === 412
        ? "PRECONDITION_FAILED"
        : error.status === 403
          ? "FORBIDDEN"
          : error.status === 404
            ? "NOT_FOUND"
            : error.status === 429
              ? "TOO_MANY_REQUESTS"
              : "BAD_GATEWAY";
    return new TRPCError({ code, message: error.message || fallback });
  }
  return new TRPCError({ code: "BAD_GATEWAY", message: fallback });
}
