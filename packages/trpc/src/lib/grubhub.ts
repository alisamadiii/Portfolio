import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, gte, inArray, lt } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { hubGrubhubOrder, hubGrubhubStore } from "@workspace/drizzle/schema";

import {
  OPEN_ORDER_STATUSES,
  classifyWebhook,
  grubhubHeaders,
  grubhubHosts,
  grubhubTimestamp,
  macNonce,
  mapMerchant,
  mapOrder,
  nextMidnightIn,
  ordersWindow,
  type PosMerchantData,
  type PosOrder,
} from "./grubhub-shared";

// ─── Grubhub Marketplace API (the agency's partner credentials, every client's store) ──
// Raw REST, no SDK. Every call is signed with the partner's MAC credentials;
// there is no merchant token at all. GRUBHUB_ENV picks preprod (default) or
// production hosts, GRUBHUB_API_URL (local only) points at the mock server.

const issueDate = () => {
  const raw = process.env.GRUBHUB_ISSUE_DATE ?? "";
  const d = /^\d+$/.test(raw) ? new Date(Number(raw)) : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const isGrubhubConfigured = () =>
  Boolean(
    process.env.GRUBHUB_PARTNER_KEY &&
      process.env.GRUBHUB_CLIENT_ID &&
      process.env.GRUBHUB_CLIENT_SECRET &&
      issueDate()
  );

export const isGrubhubWebhookConfigured = () =>
  Boolean(process.env.GRUBHUB_WEBHOOK_USER && process.env.GRUBHUB_WEBHOOK_PASSWORD);

const hosts = () => grubhubHosts(process.env.GRUBHUB_ENV, process.env.GRUBHUB_API_URL);

export class GrubhubApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

type ErrorBody = { http_status?: number; error_message?: string; message?: string; error?: string } | null;

async function grubhub<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
  const url = new URL(path, hosts().api);
  const payload = body === undefined ? null : JSON.stringify(body);
  const headers = grubhubHeaders(
    process.env.GRUBHUB_PARTNER_KEY ?? "",
    { clientId: process.env.GRUBHUB_CLIENT_ID ?? "", secret: process.env.GRUBHUB_CLIENT_SECRET ?? "" },
    { method, url, body: payload, nonce: macNonce(issueDate() ?? new Date(0)) }
  );
  const res = await fetch(url, { method, headers, body: payload ?? undefined });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ErrorBody;
    throw new GrubhubApiError(
      res.status,
      err?.error_message ?? err?.message ?? err?.error ?? `Grubhub request failed (${res.status})`
    );
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const m = (merchantId: string) => `/pos/v1/merchant/${encodeURIComponent(merchantId)}`;

export const getMerchant = (merchantId: string) => grubhub<PosMerchantData>("GET", m(merchantId));

/** Hard pause / resume: the merchant disappears from Grubhub until set ONLINE again. */
export const setPosStatus = (merchantId: string, status: "ONLINE" | "OFFLINE", reason?: string | null) =>
  grubhub<void>("PUT", `${m(merchantId)}/pos-status`, { new_pos_status: status, ...(reason ? { reason } : {}) });

/** Soft pause: closed until the store's next opening time. */
export const closeNow = (merchantId: string) => grubhub<void>("POST", `${m(merchantId)}/schedules/closenow`);
export const openNow = (merchantId: string) => grubhub<void>("POST", `${m(merchantId)}/schedules/opennow`);

export function listOrders(merchantId: string, statuses: string[], start: Date, end: Date) {
  const params = new URLSearchParams();
  for (const s of statuses) params.append("status", s);
  params.set("start", grubhubTimestamp(start));
  params.set("end", grubhubTimestamp(end));
  return grubhub<PosOrder[]>("GET", `${m(merchantId)}/orders?${params}`);
}

export const getOrder = (merchantId: string, orderUuid: string) =>
  grubhub<PosOrder>("GET", `${m(merchantId)}/orders/${encodeURIComponent(orderUuid)}`);

export const updateOrderStatus = (merchantId: string, orderUuid: string, body: Record<string, unknown>) =>
  grubhub<void>("PUT", `${m(merchantId)}/orders/${encodeURIComponent(orderUuid)}/status`, body);

export type ChangeRequestStatus = {
  order_id?: string;
  change_request_id?: string;
  status?: string;
  ticket_id?: number;
  requested_action?: string;
  request?: { change_action?: string; reason?: string };
};

export const createChangeRequest = (merchantId: string, orderUuid: string, body: Record<string, unknown>) =>
  grubhub<ChangeRequestStatus | undefined>("POST", `${m(merchantId)}/orders/${encodeURIComponent(orderUuid)}/changerequests`, body);

export const listChangeRequests = (merchantId: string, orderUuid: string) =>
  grubhub<ChangeRequestStatus[] | ChangeRequestStatus | undefined>(
    "GET",
    `${m(merchantId)}/orders/${encodeURIComponent(orderUuid)}/changerequests`
  );

export type ActivationResponse = {
  batch_id?: string;
  merchant_activation_enablement_response?: { cust_id?: number | string; kicked_off_enablement?: boolean; reason?: string[] }[];
};

/** Kicks off "set the integration live" after a successful menu ingestion (job id from phase 2). */
export const partnerActivate = (jobId: string) =>
  grubhub<ActivationResponse>("POST", "/merchant/onboarding/v1/partner/activate", { job_id: jobId });

export const partnerDeactivate = (merchantId: string) =>
  grubhub<{ merchant_id?: string; status?: string }>("POST", "/merchant/onboarding/v1/partner/deactivate", {
    merchant_id: merchantId,
  });

/** Preprod only: a zero-cost order that flows through the whole pipeline and lands on our webhook. */
export const createTestOrder = (merchantId: string, delivery: boolean) =>
  grubhub<string>("POST", `${m(merchantId)}/test/transmission`, { is_delivery: delivery, is_catering: false, is_validation: false });

// ─── Hub side ────────────────────────────────────────────────────

export const grubhubStoreFor = (projectId: string) =>
  db.query.hubGrubhubStore.findFirst({ where: eq(hubGrubhubStore.projectId, projectId) });

export const grubhubStoreByMerchant = (merchantId: string) =>
  db.query.hubGrubhubStore.findFirst({ where: eq(hubGrubhubStore.merchantId, merchantId) });

/** Saves the verified merchant on the project. A re-connect keeps the integration status. */
export async function bindGrubhubStore(projectId: string, userId: string | null, merchant: PosMerchantData) {
  const details = mapMerchant(merchant);
  const now = new Date();
  await db
    .insert(hubGrubhubStore)
    .values({
      projectId,
      ...details,
      integrationStatus: "PENDING",
      connectedUserId: userId,
      lastSyncedAt: now,
      lastError: null,
    })
    .onConflictDoUpdate({
      target: hubGrubhubStore.projectId,
      set: { ...details, connectedUserId: userId, lastSyncedAt: now, lastError: null, updatedAt: now },
    });
}

/** Re-reads the merchant from Grubhub; never throws. */
export async function syncGrubhubStore(row: { id: string; merchantId: string }) {
  try {
    const merchant = await getMerchant(row.merchantId);
    const details = mapMerchant(merchant);
    await db
      .update(hubGrubhubStore)
      .set({
        ...details,
        // The merchant id is the row's key; Grubhub's answer never renames it.
        merchantId: row.merchantId,
        lastSyncedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(hubGrubhubStore.id, row.id));
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Grubhub sync failed";
    await db
      .update(hubGrubhubStore)
      .set({ lastError: message, updatedAt: new Date() })
      .where(eq(hubGrubhubStore.id, row.id));
    return { ok: false as const, error: message };
  }
}

/**
 * Saves one Grubhub order (webhook body or GET answer). Safe to run twice:
 * Grubhub's fields are overwritten, ours (wait time, reject reason, cancel
 * request) are kept. Backfills the store's timezone from the first order.
 */
export async function upsertGrubhubOrder(
  store: { id: string; projectId: string; merchantId: string; timezone: string | null },
  order: PosOrder
) {
  const mapped = mapOrder(order);
  const { timezone, merchantId: _ignored, ...columns } = mapped;
  const now = new Date();
  await db
    .insert(hubGrubhubOrder)
    .values({
      ...columns,
      projectId: store.projectId,
      merchantId: store.merchantId,
      payload: order as unknown as Record<string, unknown>,
      receivedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: hubGrubhubOrder.id,
      set: {
        orderNumber: columns.orderNumber,
        status: columns.status,
        fulfillment: columns.fulfillment,
        scheduling: columns.scheduling,
        isTest: columns.isTest,
        placedAt: columns.placedAt,
        whenFor: columns.whenFor,
        dinerName: columns.dinerName,
        items: columns.items,
        itemCount: columns.itemCount,
        merchantSubtotalCents: columns.merchantSubtotalCents,
        taxCents: columns.taxCents,
        tipCents: columns.tipCents,
        feesCents: columns.feesCents,
        merchantTotalCents: columns.merchantTotalCents,
        grandTotalCents: columns.grandTotalCents,
        dinerGrandTotalCents: columns.dinerGrandTotalCents,
        confirmedAt: columns.confirmedAt,
        readyAt: columns.readyAt,
        fulfilledAt: columns.fulfilledAt,
        closedAt: columns.closedAt,
        externalOrderId: columns.externalOrderId,
        payload: order as unknown as Record<string, unknown>,
        receivedAt: now,
        updatedAt: now,
      },
    });
  if (!store.timezone && timezone) {
    await db.update(hubGrubhubStore).set({ timezone, updatedAt: now }).where(eq(hubGrubhubStore.id, store.id));
  }
  return mapped;
}

const storeByAnyMerchantId = async (ids: (string | null | undefined)[]) => {
  const clean = [...new Set(ids.filter((x): x is string => !!x))];
  if (!clean.length) return null;
  return db.query.hubGrubhubStore.findFirst({ where: inArray(hubGrubhubStore.merchantId, clean) });
};

/**
 * One webhook from Grubhub, whatever kind. Unknown merchants are ignored (the
 * event isn't ours to act on) and reported handled:false, never thrown.
 */
export async function handleGrubhubWebhook(body: unknown) {
  const event = classifyWebhook(body);
  const now = new Date();
  switch (event.kind) {
    case "order": {
      const order = event.order;
      const merchantId = order.merchant_id != null ? String(order.merchant_id) : null;
      const store = await storeByAnyMerchantId([merchantId, order.order_merchant_id]);
      if (!store) return { kind: event.kind, handled: false as const, reason: "unknown merchant", id: order.uuid };
      const mapped = await upsertGrubhubOrder(store, order);
      // Grubhub only routes orders to live integrations, so a real order means we're live.
      if (store.integrationStatus === "PENDING" && !mapped.isTest) {
        await db
          .update(hubGrubhubStore)
          .set({ integrationStatus: "LIVE", liveAt: now, updatedAt: now })
          .where(eq(hubGrubhubStore.id, store.id));
      }
      return { kind: event.kind, handled: true as const, id: order.uuid };
    }
    case "activation": {
      let touched = 0;
      for (const r of event.results) {
        const store = await grubhubStoreByMerchant(r.merchantId);
        if (!store) continue;
        touched++;
        if (/SUCCESS|LIVE|ACTIVE|COMPLETE/i.test(r.status)) {
          await db
            .update(hubGrubhubStore)
            .set({ integrationStatus: "LIVE", liveAt: r.liveDate ?? now, lastError: null, activationJobId: event.jobId ?? store.activationJobId, updatedAt: now })
            .where(eq(hubGrubhubStore.id, store.id));
        } else {
          await db
            .update(hubGrubhubStore)
            .set({ lastError: `Activation ${r.status.toLowerCase()}${r.reasonMessage ? `: ${r.reasonMessage}` : ""}`, updatedAt: now })
            .where(eq(hubGrubhubStore.id, store.id));
        }
      }
      return { kind: event.kind, handled: touched > 0, id: event.jobId };
    }
    case "availability": {
      const store = await grubhubStoreByMerchant(event.merchantId);
      if (!store) return { kind: event.kind, handled: false as const, reason: "unknown merchant", id: event.merchantId };
      const online = event.status === "ONLINE";
      await db
        .update(hubGrubhubStore)
        .set({
          availability: event.status,
          availabilityEndTime: event.endTime,
          availabilityReason: event.reason,
          availabilityAt: now,
          // A pause with an end time is Grubhub's soft pause; without one it's the hard pause.
          ...(event.endTime || online ? { closedToday: !online && !!event.endTime, closedTodayAt: online ? null : now } : {}),
          ...(!event.endTime ? { posStatus: online ? "ONLINE" : "OFFLINE", posStatusChangedAt: now, posStatusReason: event.reason } : {}),
          updatedAt: now,
        })
        .where(eq(hubGrubhubStore.id, store.id));
      return { kind: event.kind, handled: true as const, id: event.merchantId };
    }
    case "merchant_config": {
      let touched = 0;
      for (const id of event.merchantIds) {
        const store = await grubhubStoreByMerchant(id);
        if (!store) continue;
        touched++;
        await syncGrubhubStore(store);
      }
      return { kind: event.kind, handled: touched > 0, id: event.merchantIds.join(",") };
    }
    case "menu_ingestion":
      return { kind: event.kind, handled: false as const, reason: "menu is phase 2", id: event.jobId };
    default:
      return { kind: "unknown" as const, handled: false as const, reason: `keys: ${event.keys.join(",") || "none"}`, id: null };
  }
}

const RECONCILE_WINDOW_MS = 48 * 60 * 60_000;
const RECONCILE_STATUSES = ["RESTAURANT_CONFIRMABLE", "CONFIRMED", "PICKUP_READY", "OUT_FOR_DELIVERY"];

/**
 * Hourly: refresh the merchant, pull the last day's open orders from Grubhub
 * (a missed webhook can't hide a new order), re-read older open rows for their
 * final state, and clear "closed for today" once the store's day rolled over.
 */
export async function reconcileGrubhubStore(row: {
  id: string;
  projectId: string;
  merchantId: string;
  timezone: string | null;
  closedToday: boolean;
  closedTodayAt: Date | null;
}) {
  const store = await syncGrubhubStore(row);
  let updated = 0;
  let open = 0;
  if (store.ok) {
    try {
      const { start, end } = ordersWindow();
      const orders = await listOrders(row.merchantId, RECONCILE_STATUSES, start, end);
      open = orders.length;
      for (const order of orders) {
        await upsertGrubhubOrder(row, order);
        updated++;
      }
    } catch (error) {
      console.error("[grubhub] order list reconcile failed", row.merchantId, error);
    }
    const stale = await db
      .select({ id: hubGrubhubOrder.id })
      .from(hubGrubhubOrder)
      .where(
        and(
          eq(hubGrubhubOrder.projectId, row.projectId),
          inArray(hubGrubhubOrder.status, OPEN_ORDER_STATUSES),
          gte(hubGrubhubOrder.placedAt, new Date(Date.now() - RECONCILE_WINDOW_MS)),
          lt(hubGrubhubOrder.placedAt, new Date(Date.now() - 24 * 60 * 60_000))
        )
      )
      .limit(100);
    for (const o of stale) {
      try {
        await upsertGrubhubOrder(row, await getOrder(row.merchantId, o.id));
        updated++;
      } catch (error) {
        console.error("[grubhub] order reconcile failed", o.id, error);
      }
    }
  }
  if (row.closedToday && row.closedTodayAt && nextMidnightIn(row.timezone, row.closedTodayAt).getTime() <= Date.now()) {
    await db
      .update(hubGrubhubStore)
      .set({ closedToday: false, closedTodayAt: null, updatedAt: new Date() })
      .where(eq(hubGrubhubStore.id, row.id));
  }
  return { ok: store.ok, open, updated };
}

/** Deletes every Grubhub row of a project (disconnect, project delete). */
export async function deleteGrubhubRows(projectIds: string[]) {
  if (!projectIds.length) return;
  await db.delete(hubGrubhubOrder).where(inArray(hubGrubhubOrder.projectId, projectIds));
  await db.delete(hubGrubhubStore).where(inArray(hubGrubhubStore.projectId, projectIds));
}

export const toTRPC = (error: unknown, fallback: string): TRPCError => {
  if (error instanceof TRPCError) return error;
  if (error instanceof GrubhubApiError) {
    return new TRPCError({
      code:
        error.status === 401
          ? "PRECONDITION_FAILED"
          : error.status === 403
            ? "FORBIDDEN"
            : error.status === 404
              ? "NOT_FOUND"
              : error.status === 409
                ? "CONFLICT"
                : error.status === 429
                  ? "TOO_MANY_REQUESTS"
                  : "BAD_GATEWAY",
      message:
        error.status === 401 || error.status === 403
          ? "Grubhub rejected the hub's credentials. Contact support."
          : error.message || fallback,
    });
  }
  return new TRPCError({ code: "BAD_GATEWAY", message: fallback });
};
