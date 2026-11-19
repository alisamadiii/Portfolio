import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import { hubGrubhubOrder, hubGrubhubStore } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, cmsWriteProcedure, createTRPCRouter } from "../init";
import { isAdminUser } from "../lib/authz-shared";
import {
  bindGrubhubStore,
  closeNow,
  createChangeRequest,
  createTestOrder,
  deleteGrubhubRows,
  getMerchant,
  getOrder,
  grubhubStoreByMerchant,
  grubhubStoreFor,
  isGrubhubConfigured,
  listChangeRequests,
  openNow,
  partnerActivate,
  partnerDeactivate,
  setPosStatus,
  syncGrubhubStore,
  toTRPC,
  updateOrderStatus,
  upsertGrubhubOrder,
  type ChangeRequestStatus,
} from "../lib/grubhub";
import {
  CANCEL_CODES,
  ORDER_STATUS_GROUPS,
  OPEN_ORDER_STATUSES,
  REJECT_CODES,
  SOLD_ORDER_STATUSES,
  WAIT_TIME_CHOICES,
  allowedActions,
  cancelRequestBody,
  confirmDeadline,
  grubhubEnv,
  localDateIn,
  localDayStart,
  mapMerchant,
  mapOrderDetail,
  splitName,
  statusUpdateBody,
  type PosOrder,
} from "../lib/grubhub-shared";
import { requireApp } from "../lib/payment/entitlements";
import { rateLimit } from "../middleware/rate-limit";

// Grubhub app: the owner links the store by merchant ID (verified with the
// agency's partner credentials), orders arrive by webhook (apps/api
// /api/webhook/grubhub), and this router confirms / rejects / readies them
// and pauses the store. The store is PENDING until Grubhub switches the
// integration on.
const appGate = <T extends { user: { email: string; role?: string | null }; projectId: string }>(ctx: T) =>
  requireApp(ctx.user, ctx.projectId, "grubhub");
const appCmsProcedure = cmsProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});
const appCmsFullAccessProcedure = cmsFullAccessProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});
// Staff (content editors and up) act on orders.
const appCmsWriteProcedure = cmsWriteProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});
// Admin-only: activation, deactivation, test orders, the manual live switch.
const appAdminProcedure = appCmsFullAccessProcedure.use(async ({ ctx, next }) => {
  if (!isAdminUser(ctx.user)) throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});

const PAGE_SIZE = 50;
const DAY_MS = 24 * 60 * 60_000;
// Store calls hit Grubhub on the client's live listing.
const STORE_LIMIT = { max: 20, windowMs: 10 * 60 * 1000, scope: "grubhub" };
const ORDER_LIMIT = { max: 60, windowMs: 10 * 60 * 1000, scope: "grubhub-orders" };

const rangeDays = z.union([z.literal(7), z.literal(28), z.literal(90)]);
const rangeStart = (timezone: string | null, days: number, now = new Date()) => localDayStart(timezone, days - 1, now);

const merchantIdInput = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[\w-]+$/, "Only letters, numbers, dashes and underscores.");
const orderIdInput = z.string().min(1).max(100);
const waitTimeInput = z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(45), z.literal(60)]) satisfies z.ZodType<
  (typeof WAIT_TIME_CHOICES)[number]
>;

const notConfigured = () =>
  new TRPCError({ code: "PRECONDITION_FAILED", message: "Grubhub isn't set up yet. Contact support." });

const needStore = async (projectId: string) => {
  const store = await grubhubStoreFor(projectId);
  if (!store) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect your Grubhub store first." });
  return store;
};

const needLiveStore = async (projectId: string) => {
  const store = await needStore(projectId);
  if (store.integrationStatus !== "LIVE") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Grubhub hasn't switched this store's integration on yet." });
  }
  return store;
};

const needOrder = async (projectId: string, id: string) => {
  const saved = await db.query.hubGrubhubOrder.findFirst({
    where: and(eq(hubGrubhubOrder.id, id), eq(hubGrubhubOrder.projectId, projectId)),
  });
  if (!saved) throw new TRPCError({ code: "NOT_FOUND" });
  return saved;
};

const storeOut = (s: NonNullable<Awaited<ReturnType<typeof grubhubStoreFor>>>) => ({
  merchantId: s.merchantId,
  name: s.name,
  address: s.address,
  timezone: s.timezone,
  accountStatus: s.accountStatus,
  acceptingOnlineOrders: s.acceptingOnlineOrders,
  integrationStatus: s.integrationStatus,
  liveAt: s.liveAt?.toISOString() ?? null,
  activationJobId: s.activationJobId,
  posStatus: s.posStatus,
  posStatusReason: s.posStatusReason,
  posStatusChangedAt: s.posStatusChangedAt?.toISOString() ?? null,
  closedToday: s.closedToday,
  closedTodayAt: s.closedTodayAt?.toISOString() ?? null,
  availability: s.availability,
  availabilityEndTime: s.availabilityEndTime?.toISOString() ?? null,
  availabilityReason: s.availabilityReason,
  availabilityAt: s.availabilityAt?.toISOString() ?? null,
  lastSyncedAt: s.lastSyncedAt?.toISOString() ?? null,
  lastError: s.lastError,
});

type OrderRow = typeof hubGrubhubOrder.$inferSelect;

const orderOut = (o: OrderRow) => ({
  id: o.id,
  orderNumber: o.orderNumber,
  status: o.status,
  fulfillment: o.fulfillment,
  scheduling: o.scheduling,
  isTest: o.isTest,
  placedAt: o.placedAt.toISOString(),
  whenFor: o.whenFor?.toISOString() ?? null,
  dinerName: o.dinerName,
  items: o.items,
  itemCount: o.itemCount,
  merchantTotalCents: o.merchantTotalCents,
  grandTotalCents: o.grandTotalCents,
  tipCents: o.tipCents,
  waitTimeMinutes: o.waitTimeMinutes,
  cancelRequestStatus: o.cancelRequestStatus,
});

const iso = (d: Date | null) => d?.toISOString() ?? null;

/** The latest change request's status word, or null. */
const latestCancelStatus = (answer: ChangeRequestStatus[] | ChangeRequestStatus | undefined) => {
  const list = Array.isArray(answer) ? answer : answer ? [answer] : [];
  const cancels = list.filter((c) => (c.request?.change_action ?? c.requested_action ?? "").includes("cancel"));
  const last = (cancels.length ? cancels : list).at(-1);
  return { id: last?.change_request_id ?? null, status: last?.status ?? null, list };
};

/** Sends one status change to Grubhub and mirrors it locally; the webhook confirms it shortly after. */
async function pushStatus(
  store: { merchantId: string },
  saved: OrderRow,
  body: Record<string, unknown>,
  local: Partial<OrderRow>,
  fallback: string
) {
  try {
    await updateOrderStatus(store.merchantId, saved.id, body);
  } catch (error) {
    throw toTRPC(error, fallback);
  }
  await db
    .update(hubGrubhubOrder)
    .set({ ...local, updatedAt: new Date() })
    .where(eq(hubGrubhubOrder.id, saved.id));
}

export const grubhubRouter = createTRPCRouter({
  /** The linked store (null = not connected). */
  get: appCmsProcedure.query(async ({ ctx }) => {
    const store = await grubhubStoreFor(ctx.projectId);
    return {
      configured: isGrubhubConfigured(),
      env: grubhubEnv(process.env.GRUBHUB_ENV),
      store: store ? storeOut(store) : null,
    };
  }),

  /** Step 1 of connecting: read the merchant from Grubhub so the owner can confirm it's theirs. Nothing is saved. */
  lookupMerchant: appCmsFullAccessProcedure.input(z.object({ merchantId: merchantIdInput })).mutation(async ({ ctx, input }) => {
    if (!isGrubhubConfigured()) throw notConfigured();
    const taken = await grubhubStoreByMerchant(input.merchantId);
    if (taken && taken.projectId !== ctx.projectId) {
      throw new TRPCError({ code: "CONFLICT", message: "That Grubhub store is already connected to another project." });
    }
    await rateLimit(STORE_LIMIT.max, STORE_LIMIT.windowMs, STORE_LIMIT.scope);
    try {
      const merchant = await getMerchant(input.merchantId);
      const mapped = mapMerchant(merchant);
      return { ...mapped, merchantId: mapped.merchantId || input.merchantId };
    } catch (error) {
      throw toTRPC(error, "Grubhub didn't recognise that merchant ID.");
    }
  }),

  /** Step 2: save the merchant on the project. PENDING until Grubhub switches the integration on. */
  connect: appCmsFullAccessProcedure.input(z.object({ merchantId: merchantIdInput })).mutation(async ({ ctx, input }) => {
    if (!isGrubhubConfigured()) throw notConfigured();
    const taken = await grubhubStoreByMerchant(input.merchantId);
    if (taken && taken.projectId !== ctx.projectId) {
      throw new TRPCError({ code: "CONFLICT", message: "That Grubhub store is already connected to another project." });
    }
    try {
      const merchant = await getMerchant(input.merchantId);
      await bindGrubhubStore(ctx.projectId, ctx.user.id, { ...merchant, merchant_id: input.merchantId });
    } catch (error) {
      throw toTRPC(error, "Couldn't connect that store. Try again.");
    }
    return { ok: true };
  }),

  /** Orders today / 7 days / 30 days and sales, from the orders saved here. Sales = Grubhub's merchant_total, before commission. */
  stats: appCmsProcedure.query(async ({ ctx }) => {
    const store = await grubhubStoreFor(ctx.projectId);
    if (!store) return null;
    const now = new Date();
    const today = localDayStart(store.timezone, 0, now);
    const week = new Date(now.getTime() - 7 * DAY_MS);
    const month = new Date(now.getTime() - 30 * DAY_MS);
    const real = sql`${hubGrubhubOrder.isTest} = false`;
    const sold = sql`${inArray(hubGrubhubOrder.status, SOLD_ORDER_STATUSES)} and ${real}`;
    const inMonth = sql`${hubGrubhubOrder.placedAt} >= ${month} and ${sold}`;
    const [row] = await db
      .select({
        today: sql<number>`count(*) filter (where ${hubGrubhubOrder.placedAt} >= ${today} and ${sold})::int`,
        week: sql<number>`count(*) filter (where ${hubGrubhubOrder.placedAt} >= ${week} and ${sold})::int`,
        month: sql<number>`count(*) filter (where ${inMonth})::int`,
        salesMonthCents: sql<number>`coalesce(sum(${hubGrubhubOrder.merchantTotalCents}) filter (where ${inMonth}), 0)::int`,
        tipsMonthCents: sql<number>`coalesce(sum(${hubGrubhubOrder.tipCents}) filter (where ${inMonth}), 0)::int`,
        open: sql<number>`count(*) filter (where ${inArray(hubGrubhubOrder.status, OPEN_ORDER_STATUSES)} and ${real})::int`,
        fresh: sql<number>`count(*) filter (where ${hubGrubhubOrder.status} = 'RESTAURANT_CONFIRMABLE' and ${real})::int`,
        total: sql<number>`count(*) filter (where ${real})::int`,
      })
      .from(hubGrubhubOrder)
      .where(eq(hubGrubhubOrder.projectId, ctx.projectId));
    return {
      today: row?.today ?? 0,
      week: row?.week ?? 0,
      month: row?.month ?? 0,
      salesMonthCents: row?.salesMonthCents ?? 0,
      tipsMonthCents: row?.tipsMonthCents ?? 0,
      open: row?.open ?? 0,
      new: row?.fresh ?? 0,
      total: row?.total ?? 0,
      currency: "USD",
    };
  }),

  /** One window for Home and the Orders page: sold orders since the store's local midnight `days - 1` days ago, bucketed per local day. */
  summary: appCmsProcedure.input(z.object({ days: rangeDays })).query(async ({ ctx, input }) => {
    const store = await grubhubStoreFor(ctx.projectId);
    if (!store) return null;
    const start = rangeStart(store.timezone, input.days);
    const tz = store.timezone || "UTC";
    const where = and(
      eq(hubGrubhubOrder.projectId, ctx.projectId),
      eq(hubGrubhubOrder.isTest, false),
      inArray(hubGrubhubOrder.status, SOLD_ORDER_STATUSES),
      gte(hubGrubhubOrder.placedAt, start)
    );
    const day = sql<string>`to_char((${hubGrubhubOrder.placedAt} at time zone 'UTC') at time zone ${tz}::text, 'YYYY-MM-DD')`;
    const [[totals], byDay] = await Promise.all([
      db
        .select({
          orders: sql<number>`count(*)::int`,
          salesCents: sql<number>`coalesce(sum(${hubGrubhubOrder.merchantTotalCents}), 0)::int`,
        })
        .from(hubGrubhubOrder)
        .where(where),
      db
        .select({
          date: day,
          orders: sql<number>`count(*)::int`,
          salesCents: sql<number>`coalesce(sum(${hubGrubhubOrder.merchantTotalCents}), 0)::int`,
        })
        .from(hubGrubhubOrder)
        .where(where)
        .groupBy(day)
        .orderBy(day),
    ]);
    const orders = totals?.orders ?? 0;
    const salesCents = totals?.salesCents ?? 0;
    return {
      orders,
      salesCents,
      avgOrderCents: orders > 0 ? Math.round(salesCents / orders) : null,
      currency: "USD",
      timezone: store.timezone,
      from: localDateIn(store.timezone, start),
      to: localDateIn(store.timezone),
      byDay,
    };
  }),

  /** Newest first, keyset on placedAt. Filters compose with the cursor; `days` counts from the store's local midnight. */
  orders: appCmsProcedure
    .input(
      z.object({
        cursor: z.string().datetime().optional(),
        days: rangeDays.optional(),
        status: z.enum(["open", "completed", "canceled"]).optional(),
        limit: z.union([z.literal(5), z.literal(50)]).default(PAGE_SIZE),
      })
    )
    .query(async ({ ctx, input }) => {
      const store = input.days ? await grubhubStoreFor(ctx.projectId) : null;
      const rows = await db
        .select()
        .from(hubGrubhubOrder)
        .where(
          and(
            eq(hubGrubhubOrder.projectId, ctx.projectId),
            input.cursor ? lt(hubGrubhubOrder.placedAt, new Date(input.cursor)) : undefined,
            input.days ? gte(hubGrubhubOrder.placedAt, rangeStart(store?.timezone ?? null, input.days)) : undefined,
            input.status ? inArray(hubGrubhubOrder.status, ORDER_STATUS_GROUPS[input.status]) : undefined
          )
        )
        .orderBy(desc(hubGrubhubOrder.placedAt))
        .limit(input.limit + 1);
      const page = rows.slice(0, input.limit);
      return {
        items: page.map(orderOut),
        nextCursor: rows.length > input.limit ? page[page.length - 1]!.placedAt.toISOString() : null,
      };
    }),

  /**
   * One order from its saved payload (Grubhub's webhook carries the whole
   * order, so no live call is needed). `refresh` re-reads it from Grubhub first.
   */
  order: appCmsProcedure
    .input(z.object({ id: orderIdInput, refresh: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const store = await needStore(ctx.projectId);
      let saved = await needOrder(ctx.projectId, input.id);
      let liveError: string | null = null;
      if (input.refresh && isGrubhubConfigured()) {
        try {
          await upsertGrubhubOrder(store, await getOrder(store.merchantId, saved.id));
          saved = await needOrder(ctx.projectId, input.id);
        } catch (error) {
          console.error("[grubhub] live order read failed", input.id, error);
          liveError = "Grubhub didn't answer. Showing what was saved when the order came in.";
        }
      }
      const detail = mapOrderDetail(saved.payload as unknown as PosOrder);
      const { deadline, remainingMs } = confirmDeadline(saved.placedAt);
      return {
        ...detail,
        id: saved.id,
        status: saved.status,
        orderNumber: saved.orderNumber,
        placedAt: saved.placedAt.toISOString(),
        whenFor: iso(saved.whenFor),
        confirmedAt: iso(saved.confirmedAt),
        readyAt: iso(saved.readyAt),
        fulfilledAt: iso(saved.fulfilledAt),
        closedAt: iso(saved.closedAt),
        pickup: detail.pickup ? { ...detail.pickup, estimatedPickupAt: iso(detail.pickup.estimatedPickupAt) } : null,
        delivery: detail.delivery
          ? {
              ...detail.delivery,
              estimatedDeliveryAt: iso(detail.delivery.estimatedDeliveryAt),
              estimatedDriverPickupAt: iso(detail.delivery.estimatedDriverPickupAt),
            }
          : null,
        waitTimeMinutes: saved.waitTimeMinutes,
        rejectReasonCode: saved.rejectReasonCode,
        rejectMessage: saved.rejectMessage,
        cancelRequestId: saved.cancelRequestId,
        cancelRequestStatus: saved.cancelRequestStatus,
        currency: "USD",
        liveError,
        store: { name: store.name, address: store.address, timezone: store.timezone, integrationStatus: store.integrationStatus },
        actions: allowedActions(saved.status, saved.fulfillment),
        deadline: deadline.toISOString(),
        remainingMs,
      };
    }),

  /** "We've got it": CONFIRMED, with how long until it's ready. Required within 8 minutes or Grubhub cancels. */
  confirmOrder: appCmsWriteProcedure
    .input(z.object({ id: orderIdInput, waitTimeMinutes: waitTimeInput.optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!isGrubhubConfigured()) throw notConfigured();
      const store = await needLiveStore(ctx.projectId);
      const saved = await needOrder(ctx.projectId, input.id);
      if (!allowedActions(saved.status, saved.fulfillment).confirm) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This order can't be confirmed anymore." });
      }
      await rateLimit(ORDER_LIMIT.max, ORDER_LIMIT.windowMs, ORDER_LIMIT.scope);
      await pushStatus(
        store,
        saved,
        statusUpdateBody({ action: "confirm", waitTimeMinutes: input.waitTimeMinutes, externalOrderId: saved.orderNumber }),
        { status: "CONFIRMED", confirmedAt: new Date(), waitTimeMinutes: input.waitTimeMinutes ?? null },
        "Grubhub didn't take the confirmation. Try again."
      );
      return { status: "CONFIRMED" as const };
    }),

  rejectOrder: appCmsWriteProcedure
    .input(z.object({ id: orderIdInput, code: z.enum(REJECT_CODES), message: z.string().trim().min(1).max(300) }))
    .mutation(async ({ ctx, input }) => {
      if (!isGrubhubConfigured()) throw notConfigured();
      const store = await needLiveStore(ctx.projectId);
      const saved = await needOrder(ctx.projectId, input.id);
      if (!allowedActions(saved.status, saved.fulfillment).reject) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This order can't be rejected anymore. Ask Grubhub Care to cancel it." });
      }
      await rateLimit(ORDER_LIMIT.max, ORDER_LIMIT.windowMs, ORDER_LIMIT.scope);
      await pushStatus(
        store,
        saved,
        statusUpdateBody({ action: "reject", code: input.code, message: input.message }),
        { status: "REJECTED", closedAt: new Date(), rejectReasonCode: input.code, rejectMessage: input.message },
        "Grubhub didn't take the rejection. Try again."
      );
      return { status: "REJECTED" as const };
    }),

  /** Food's ready for the customer or the Grubhub driver. */
  markReady: appCmsWriteProcedure.input(z.object({ id: orderIdInput })).mutation(async ({ ctx, input }) => {
    if (!isGrubhubConfigured()) throw notConfigured();
    const store = await needLiveStore(ctx.projectId);
    const saved = await needOrder(ctx.projectId, input.id);
    if (!allowedActions(saved.status, saved.fulfillment).ready) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This order can't be marked ready right now." });
    }
    await rateLimit(ORDER_LIMIT.max, ORDER_LIMIT.windowMs, ORDER_LIMIT.scope);
    await pushStatus(
      store,
      saved,
      statusUpdateBody({ action: "ready" }),
      { status: "PICKUP_READY", readyAt: new Date() },
      "Grubhub didn't take the update. Try again."
    );
    return { status: "PICKUP_READY" as const };
  }),

  /** Own delivery: the driver left. */
  markOutForDelivery: appCmsWriteProcedure.input(z.object({ id: orderIdInput })).mutation(async ({ ctx, input }) => {
    if (!isGrubhubConfigured()) throw notConfigured();
    const store = await needLiveStore(ctx.projectId);
    const saved = await needOrder(ctx.projectId, input.id);
    if (!allowedActions(saved.status, saved.fulfillment).outForDelivery) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only your own deliveries can be marked out for delivery." });
    }
    await rateLimit(ORDER_LIMIT.max, ORDER_LIMIT.windowMs, ORDER_LIMIT.scope);
    await pushStatus(
      store,
      saved,
      statusUpdateBody({ action: "outForDelivery" }),
      { status: "OUT_FOR_DELIVERY", readyAt: saved.readyAt ?? new Date() },
      "Grubhub didn't take the update. Try again."
    );
    return { status: "OUT_FOR_DELIVERY" as const };
  }),

  /** Own delivery: handed to the customer. */
  markFulfilled: appCmsWriteProcedure.input(z.object({ id: orderIdInput })).mutation(async ({ ctx, input }) => {
    if (!isGrubhubConfigured()) throw notConfigured();
    const store = await needLiveStore(ctx.projectId);
    const saved = await needOrder(ctx.projectId, input.id);
    if (!allowedActions(saved.status, saved.fulfillment).fulfilled) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only your own deliveries can be marked delivered." });
    }
    await rateLimit(ORDER_LIMIT.max, ORDER_LIMIT.windowMs, ORDER_LIMIT.scope);
    await pushStatus(
      store,
      saved,
      statusUpdateBody({ action: "fulfilled" }),
      { status: "FULFILLED", fulfilledAt: new Date() },
      "Grubhub didn't take the update. Try again."
    );
    return { status: "FULFILLED" as const };
  }),

  /** After confirming: ask Grubhub Care to cancel. Reviewed by a person, not instant. */
  requestCancel: appCmsFullAccessProcedure
    .input(z.object({ id: orderIdInput, code: z.enum(CANCEL_CODES), reason: z.string().trim().max(300).default("") }))
    .mutation(async ({ ctx, input }) => {
      if (!isGrubhubConfigured()) throw notConfigured();
      const store = await needLiveStore(ctx.projectId);
      const saved = await needOrder(ctx.projectId, input.id);
      if (!allowedActions(saved.status, saved.fulfillment).requestCancel) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only a confirmed order can be cancelled through Grubhub Care." });
      }
      await rateLimit(ORDER_LIMIT.max, ORDER_LIMIT.windowMs, ORDER_LIMIT.scope);
      const agentName = ctx.user.name?.trim() || ctx.user.email;
      const body = cancelRequestBody({
        code: input.code,
        reason: input.reason,
        agentName,
        requestor: { ...splitName(ctx.user.name, ctx.user.email), email: ctx.user.email },
      });
      let answer: ChangeRequestStatus | undefined;
      try {
        answer = await createChangeRequest(store.merchantId, saved.id, body);
      } catch (error) {
        throw toTRPC(error, "Grubhub didn't take the cancellation request. Try again.");
      }
      await db
        .update(hubGrubhubOrder)
        .set({
          cancelRequestId: answer?.change_request_id ?? saved.cancelRequestId,
          cancelRequestStatus: answer?.status ?? "REQUESTED",
          updatedAt: new Date(),
        })
        .where(eq(hubGrubhubOrder.id, saved.id));
      return { status: answer?.status ?? "REQUESTED", ticketId: answer?.ticket_id ?? null };
    }),

  /** Where the cancellation request stands with Grubhub Care. */
  cancelRequests: appCmsProcedure.input(z.object({ id: orderIdInput })).mutation(async ({ ctx, input }) => {
    if (!isGrubhubConfigured()) throw notConfigured();
    const store = await needStore(ctx.projectId);
    const saved = await needOrder(ctx.projectId, input.id);
    let answer: Awaited<ReturnType<typeof listChangeRequests>>;
    try {
      answer = await listChangeRequests(store.merchantId, saved.id);
    } catch (error) {
      throw toTRPC(error, "Grubhub didn't answer. Try again in a moment.");
    }
    const latest = latestCancelStatus(answer);
    if (latest.status) {
      await db
        .update(hubGrubhubOrder)
        .set({ cancelRequestId: latest.id ?? saved.cancelRequestId, cancelRequestStatus: latest.status, updatedAt: new Date() })
        .where(eq(hubGrubhubOrder.id, saved.id));
    }
    return {
      status: latest.status ?? saved.cancelRequestStatus,
      requests: latest.list.map((c) => ({
        id: c.change_request_id ?? null,
        status: c.status ?? null,
        action: c.request?.change_action ?? c.requested_action ?? null,
        reason: c.request?.reason ?? null,
        ticketId: c.ticket_id ?? null,
      })),
    };
  }),

  /** Hard pause (OFFLINE hides the store on Grubhub until ONLINE) with an optional reason. */
  setPosStatus: appCmsFullAccessProcedure
    .input(z.object({ status: z.enum(["ONLINE", "OFFLINE"]), reason: z.string().trim().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!isGrubhubConfigured()) throw notConfigured();
      const store = await needStore(ctx.projectId);
      await rateLimit(STORE_LIMIT.max, STORE_LIMIT.windowMs, STORE_LIMIT.scope);
      try {
        await setPosStatus(store.merchantId, input.status, input.status === "OFFLINE" ? input.reason || "Paused from Client Hub" : input.reason);
      } catch (error) {
        const t = toTRPC(error, "Grubhub didn't take the change.");
        if (t.code === "CONFLICT") {
          throw new TRPCError({ code: "CONFLICT", message: `Grubhub says the store can't change status right now: ${t.message}` });
        }
        throw t;
      }
      await db
        .update(hubGrubhubStore)
        .set({
          posStatus: input.status,
          posStatusReason: input.status === "OFFLINE" ? input.reason || null : null,
          posStatusChangedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(hubGrubhubStore.id, store.id));
      return { ok: true };
    }),

  /** Soft pause: closed for the rest of today (closenow), or open again (opennow). */
  setClosedToday: appCmsFullAccessProcedure
    .input(z.object({ closed: z.boolean(), reason: z.string().trim().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!isGrubhubConfigured()) throw notConfigured();
      const store = await needStore(ctx.projectId);
      await rateLimit(STORE_LIMIT.max, STORE_LIMIT.windowMs, STORE_LIMIT.scope);
      try {
        if (input.closed) await closeNow(store.merchantId);
        else await openNow(store.merchantId);
      } catch (error) {
        throw toTRPC(error, "Grubhub didn't take the change.");
      }
      await db
        .update(hubGrubhubStore)
        .set({
          closedToday: input.closed,
          closedTodayAt: input.closed ? new Date() : null,
          posStatusReason: input.closed ? input.reason || null : store.posStatusReason,
          updatedAt: new Date(),
        })
        .where(eq(hubGrubhubStore.id, store.id));
      return { ok: true };
    }),

  refresh: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    if (!isGrubhubConfigured()) throw notConfigured();
    const store = await needStore(ctx.projectId);
    await rateLimit(STORE_LIMIT.max, STORE_LIMIT.windowMs, STORE_LIMIT.scope);
    const result = await syncGrubhubStore(store);
    if (!result.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: result.error });
    return { ok: true };
  }),

  /** Unlinks the store and deletes the orders saved here. Best effort: tells Grubhub to drop the integration too. */
  disconnect: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const store = await grubhubStoreFor(ctx.projectId);
    if (store?.integrationStatus === "LIVE" && isGrubhubConfigured()) {
      try {
        await partnerDeactivate(store.merchantId);
      } catch (error) {
        console.error("[grubhub] partner deactivate on disconnect failed", store.merchantId, error);
      }
    }
    await deleteGrubhubRows([ctx.projectId]);
    return { ok: true };
  }),

  /** Admin: kick off activation with a menu ingestion job id (phase 2 produces it). */
  activate: appAdminProcedure.input(z.object({ jobId: z.string().trim().min(1).max(100) })).mutation(async ({ ctx, input }) => {
    if (!isGrubhubConfigured()) throw notConfigured();
    const store = await needStore(ctx.projectId);
    let answer: Awaited<ReturnType<typeof partnerActivate>>;
    try {
      answer = await partnerActivate(input.jobId);
    } catch (error) {
      throw toTRPC(error, "Grubhub didn't take the activation request.");
    }
    const mine = answer.merchant_activation_enablement_response?.find((r) => String(r.cust_id) === store.merchantId);
    await db
      .update(hubGrubhubStore)
      .set({
        activationJobId: input.jobId,
        lastError: mine && mine.kicked_off_enablement === false ? `Activation not started: ${(mine.reason ?? []).join("; ") || "no reason given"}` : null,
        updatedAt: new Date(),
      })
      .where(eq(hubGrubhubStore.id, store.id));
    return { batchId: answer.batch_id ?? null, kickedOff: mine?.kicked_off_enablement ?? null, reasons: mine?.reason ?? [] };
  }),

  /** Admin: switch the integration off on Grubhub's side. */
  deactivate: appAdminProcedure.mutation(async ({ ctx }) => {
    if (!isGrubhubConfigured()) throw notConfigured();
    const store = await needStore(ctx.projectId);
    try {
      await partnerDeactivate(store.merchantId);
    } catch (error) {
      throw toTRPC(error, "Grubhub didn't take the deactivation.");
    }
    await db
      .update(hubGrubhubStore)
      .set({ integrationStatus: "DEACTIVATED", deactivatedAt: new Date(), updatedAt: new Date() })
      .where(eq(hubGrubhubStore.id, store.id));
    return { ok: true };
  }),

  /** Admin: manual override when Grubhub flipped the switch without telling us (or for a test). */
  setIntegrationStatus: appAdminProcedure
    .input(z.object({ status: z.enum(["PENDING", "LIVE"]) }))
    .mutation(async ({ ctx, input }) => {
      const store = await needStore(ctx.projectId);
      await db
        .update(hubGrubhubStore)
        .set({
          integrationStatus: input.status,
          liveAt: input.status === "LIVE" ? (store.liveAt ?? new Date()) : store.liveAt,
          deactivatedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(hubGrubhubStore.id, store.id));
      return { ok: true };
    }),

  /** Admin, preprod only: a zero-cost Grubhub test order that arrives through the webhook. */
  createTestOrder: appAdminProcedure.input(z.object({ delivery: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
    if (!isGrubhubConfigured()) throw notConfigured();
    if (grubhubEnv(process.env.GRUBHUB_ENV) === "production") {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Test orders only exist in Grubhub's pre-production environment." });
    }
    const store = await needStore(ctx.projectId);
    try {
      const id = await createTestOrder(store.merchantId, input.delivery);
      return { id: typeof id === "string" ? id : null };
    } catch (error) {
      throw toTRPC(error, "Grubhub didn't create the test order.");
    }
  }),
});
