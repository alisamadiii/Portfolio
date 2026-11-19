import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, gte, inArray, lt } from "drizzle-orm";

import { readAccountToken } from "@workspace/auth/tokens";
import { db } from "@workspace/drizzle/pool";
import { hubUberOrder, hubUberProvision, hubUberStore } from "@workspace/drizzle/schema";

import {
  MERCHANT_SCOPE,
  ORDER_SCOPES,
  OPEN_ORDER_STATES,
  STORE_SCOPES,
  eventIds,
  isOrderEvent,
  mapOrder,
  mapStore,
  mapStoreStatus,
  uberHosts,
  uberTimestamp,
  type UberEvent,
  type UberOrderV2,
  type UberStore,
  type UberStoreStatus,
} from "./uber-eats-shared";

// ─── Uber Eats Marketplace API (the agency's one app, every client's store) ──
// Raw REST, no SDK. Two kinds of token:
//  - the merchant's (authorization_code, eats.pos_provisioning): used once to
//    list their stores and activate our integration on one; never kept past
//    the store pick (hub_uber_provision, encrypted, 30 min).
//  - the app's (client_credentials): store details, online status, orders.
//    30-day tokens, 100 token requests per hour across the app, so they're
//    cached per scope set.
// UBER_EATS_ENV picks sandbox (default) or production hosts.

export const isUberEatsConfigured = () =>
  Boolean(process.env.UBER_EATS_CLIENT_ID && process.env.UBER_EATS_CLIENT_SECRET);

const hosts = () => uberHosts(process.env.UBER_EATS_ENV);

const clientId = () => process.env.UBER_EATS_CLIENT_ID ?? "";
const clientSecret = () => process.env.UBER_EATS_CLIENT_SECRET ?? "";

export const uberCallbackUrl = () =>
  new URL("/api/uber-eats/callback", process.env.NEXT_PUBLIC_API_URL).toString();

/** Where the owner goes to grant the hub access to their stores. */
export function uberAuthorizeUrl(state: string) {
  const url = new URL("/oauth/v2/authorize", hosts().auth);
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", MERCHANT_SCOPE);
  url.searchParams.set("redirect_uri", uberCallbackUrl());
  url.searchParams.set("state", state);
  return url.toString();
}

export class UberApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

type TokenResponse = { access_token?: string; expires_in?: number; scope?: string };

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${hosts().auth}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...body }),
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string };
  if (!res.ok || !json.access_token) {
    throw new UberApiError(res.status, json.error ?? `Uber token request failed (${res.status})`);
  }
  return json;
}

/** The merchant's code from the callback → their short-lived token. */
export async function exchangeUberCode(code: string) {
  const token = await postToken({
    grant_type: "authorization_code",
    redirect_uri: uberCallbackUrl(),
    code,
  });
  return token.access_token!;
}

// One app token per scope set; refreshed a day before it expires.
const cache = new Map<string, { token: string; exp: number }>();
const inflight = new Map<string, Promise<string>>();
const REFRESH_MARGIN_MS = 24 * 60 * 60_000;

async function fetchAppToken(scopes: string): Promise<string> {
  const token = await postToken({ grant_type: "client_credentials", scope: scopes });
  cache.set(scopes, {
    token: token.access_token!,
    exp: Date.now() + (token.expires_in ?? 30 * 24 * 3600) * 1000,
  });
  return token.access_token!;
}

export async function uberTokenFor(scopes: string): Promise<string> {
  const hit = cache.get(scopes);
  if (hit && hit.exp - REFRESH_MARGIN_MS > Date.now()) return hit.token;
  const pending = inflight.get(scopes);
  if (pending) return pending;
  const next = fetchAppToken(scopes).finally(() => inflight.delete(scopes));
  inflight.set(scopes, next);
  return next;
}

export const forgetUberTokens = () => cache.clear();

async function uber<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${hosts().api}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string; error?: string; code?: string }
      | null;
    throw new UberApiError(
      res.status,
      body?.message ?? body?.error ?? body?.code ?? `Uber Eats request failed (${res.status})`
    );
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Stores the token can see: the merchant's, or the ones provisioned to the app. */
export async function listUberStores(token: string): Promise<UberStore[]> {
  const stores: UberStore[] = [];
  let startKey: string | undefined;
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ limit: "50" });
    if (startKey) params.set("start_key", startKey);
    const res = await uber<{ stores?: UberStore[]; next_key?: string | null }>(
      token,
      `/v1/eats/stores?${params}`
    );
    stores.push(...(res.stores ?? []));
    if (!res.next_key) break;
    startKey = res.next_key;
  }
  return stores;
}

export const getUberStore = (token: string, storeId: string) =>
  uber<UberStore>(token, `/v1/eats/stores/${encodeURIComponent(storeId)}`);

export const getUberStoreStatus = (token: string, storeId: string) =>
  uber<UberStoreStatus>(token, `/v1/eats/store/${encodeURIComponent(storeId)}/status`);

export function setUberStoreStatus(
  token: string,
  storeId: string,
  body: { status: "ONLINE" | "PAUSED"; pausedUntil?: Date | null; reason?: string | null }
) {
  return uber<void>(token, `/v1/eats/store/${encodeURIComponent(storeId)}/status`, {
    method: "POST",
    body: JSON.stringify({
      status: body.status,
      ...(body.pausedUntil ? { paused_until: uberTimestamp(body.pausedUntil) } : {}),
      ...(body.reason ? { reason: body.reason } : {}),
    }),
  });
}

/**
 * Activates the hub on a store with the merchant's token. Not the order
 * manager: the restaurant keeps accepting orders on Uber's tablet; we only
 * read them.
 */
export function activateUberStore(merchantToken: string, storeId: string, projectId: string) {
  return uber<void>(merchantToken, `/v1/eats/stores/${encodeURIComponent(storeId)}/pos_data`, {
    method: "POST",
    body: JSON.stringify({
      integrator_store_id: projectId,
      integrator_brand_id: "client-hub",
      is_order_manager: false,
      store_configuration_data: JSON.stringify({ projectId }),
    }),
  });
}

/** Turns the integration off on Uber's side (the app token may do that much). */
export async function disableUberIntegration(storeId: string) {
  const token = await uberTokenFor(STORE_SCOPES);
  return uber<void>(token, `/v1/eats/stores/${encodeURIComponent(storeId)}/pos_data`, {
    method: "PATCH",
    body: JSON.stringify({ integration_enabled: false }),
  });
}

export const getUberOrder = (token: string, orderId: string) =>
  uber<UberOrderV2>(token, `/v2/eats/order/${encodeURIComponent(orderId)}`);

// ─── Hub side ────────────────────────────────────────────────────

export const uberStoreFor = (projectId: string) =>
  db.query.hubUberStore.findFirst({ where: eq(hubUberStore.projectId, projectId) });

/** Reads the store and its status with the app token and saves both on the project. */
export async function bindUberStore(
  projectId: string,
  userId: string | null,
  store: UberStore,
  status?: UberStoreStatus | null
) {
  const details = mapStore(store);
  const online = status ? mapStoreStatus(status) : {};
  const now = new Date();
  await db
    .insert(hubUberStore)
    .values({
      projectId,
      ...details,
      ...online,
      integrationEnabled: true,
      provisionedAt: now,
      connectedUserId: userId,
      lastSyncedAt: status ? now : null,
      lastError: null,
    })
    .onConflictDoUpdate({
      target: hubUberStore.projectId,
      set: {
        ...details,
        ...online,
        integrationEnabled: true,
        provisionedAt: now,
        deprovisionedAt: null,
        connectedUserId: userId,
        lastSyncedAt: status ? now : null,
        lastError: null,
        updatedAt: now,
      },
    });
}

/** Store details + online status from Uber with the app token; never throws. */
export async function syncUberStore(row: { id: string; storeId: string }) {
  try {
    const token = await uberTokenFor(STORE_SCOPES);
    const [store, status] = await Promise.all([
      getUberStore(token, row.storeId),
      getUberStoreStatus(token, row.storeId).catch(() => null),
    ]);
    await db
      .update(hubUberStore)
      .set({
        ...mapStore(store),
        ...(status ? mapStoreStatus(status) : {}),
        lastSyncedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(hubUberStore.id, row.id));
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Uber Eats sync failed";
    await db
      .update(hubUberStore)
      .set({ lastError: message, updatedAt: new Date() })
      .where(eq(hubUberStore.id, row.id));
    return { ok: false as const, error: message };
  }
}

/** Reads one order from Uber and saves it. Safe to run twice. */
export async function syncUberOrder(projectId: string, storeId: string, orderId: string) {
  const token = await uberTokenFor(ORDER_SCOPES);
  const order = await getUberOrder(token, orderId);
  const mapped = mapOrder(order);
  const values = {
    ...mapped,
    projectId,
    storeId: mapped.storeId ?? storeId,
    updatedAt: new Date(),
  };
  await db
    .insert(hubUberOrder)
    .values(values)
    .onConflictDoUpdate({
      target: hubUberOrder.id,
      set: {
        state: values.state,
        type: values.type,
        placedAt: values.placedAt,
        readyAt: values.readyAt,
        eaterFirstName: values.eaterFirstName,
        items: values.items,
        itemCount: values.itemCount,
        subtotalCents: values.subtotalCents,
        taxCents: values.taxCents,
        totalCents: values.totalCents,
        currency: values.currency,
        updatedAt: values.updatedAt,
      },
    });
  return mapped;
}

/**
 * One webhook from Uber. Orders are re-read from the API (the webhook only
 * carries ids); store.provisioned / deprovisioned flip the integration flag.
 * Unknown stores are ignored: the event isn't ours to act on.
 */
export async function handleUberEvent(event: UberEvent) {
  const { storeId, orderId } = eventIds(event);
  if (!storeId) return { handled: false as const, reason: "no store" };
  const store = await db.query.hubUberStore.findFirst({
    where: eq(hubUberStore.storeId, storeId),
  });
  if (!store) return { handled: false as const, reason: "unknown store" };

  if (isOrderEvent(event.event_type)) {
    if (!orderId) return { handled: false as const, reason: "no order" };
    await syncUberOrder(store.projectId, store.storeId, orderId);
    return { handled: true as const };
  }
  if (event.event_type === "store.provisioned") {
    await db
      .update(hubUberStore)
      .set({ integrationEnabled: true, provisionedAt: new Date(), deprovisionedAt: null, updatedAt: new Date() })
      .where(eq(hubUberStore.id, store.id));
    await syncUberStore(store);
    return { handled: true as const };
  }
  if (event.event_type === "store.deprovisioned") {
    await db
      .update(hubUberStore)
      .set({ integrationEnabled: false, deprovisionedAt: new Date(), onlineStatus: null, updatedAt: new Date() })
      .where(eq(hubUberStore.id, store.id));
    return { handled: true as const };
  }
  return { handled: false as const, reason: "ignored" };
}

const RECONCILE_WINDOW_MS = 48 * 60 * 60_000;

/**
 * Hourly: refresh the store, then re-read orders from the last two days that
 * are still open, so a missed webhook can't leave an order stuck on "New".
 */
export async function reconcileUberStore(row: { id: string; projectId: string; storeId: string }) {
  const store = await syncUberStore(row);
  const open = await db
    .select({ id: hubUberOrder.id })
    .from(hubUberOrder)
    .where(
      and(
        eq(hubUberOrder.projectId, row.projectId),
        inArray(hubUberOrder.state, OPEN_ORDER_STATES),
        gte(hubUberOrder.placedAt, new Date(Date.now() - RECONCILE_WINDOW_MS))
      )
    )
    .limit(200);
  let updated = 0;
  for (const order of open) {
    try {
      await syncUberOrder(row.projectId, row.storeId, order.id);
      updated++;
    } catch (error) {
      console.error("[uber-eats] order reconcile failed", order.id, error);
    }
  }
  return { ok: store.ok, open: open.length, updated };
}

/** The pending store pick for a project, with the merchant token decrypted. Expired rows are dropped. */
export async function uberProvisionFor(projectId: string) {
  const row = await db.query.hubUberProvision.findFirst({
    where: eq(hubUberProvision.projectId, projectId),
  });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(hubUberProvision).where(eq(hubUberProvision.projectId, projectId));
    return null;
  }
  const token = await readAccountToken(row.tokenEnc);
  if (!token) return null;
  return { ...row, token };
}

export const clearUberProvision = (projectId: string) =>
  db.delete(hubUberProvision).where(eq(hubUberProvision.projectId, projectId));

/** Deletes every Uber row of a project (disconnect, project delete). */
export async function deleteUberRows(projectIds: string[]) {
  if (!projectIds.length) return;
  await db.delete(hubUberOrder).where(inArray(hubUberOrder.projectId, projectIds));
  await db.delete(hubUberStore).where(inArray(hubUberStore.projectId, projectIds));
  await db.delete(hubUberProvision).where(inArray(hubUberProvision.projectId, projectIds));
}

/** Drops provisioning rows nobody finished (the cron calls this). */
export const sweepUberProvisions = () =>
  db.delete(hubUberProvision).where(lt(hubUberProvision.expiresAt, new Date()));

export const toTRPC = (error: unknown, fallback: string): TRPCError => {
  if (error instanceof TRPCError) return error;
  if (error instanceof UberApiError) {
    return new TRPCError({
      code:
        error.status === 401
          ? "PRECONDITION_FAILED"
          : error.status === 403
            ? "FORBIDDEN"
            : error.status === 404
              ? "NOT_FOUND"
              : error.status === 429
                ? "TOO_MANY_REQUESTS"
                : "BAD_GATEWAY",
      message:
        error.status === 401
          ? "Uber Eats stopped accepting the hub's access. Reconnect the store."
          : error.message || fallback,
    });
  }
  return new TRPCError({ code: "BAD_GATEWAY", message: fallback });
};
