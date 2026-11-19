import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import { hubUberOrder, hubUberStore } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, cmsWriteProcedure, createTRPCRouter } from "../init";
import { isAdminUser } from "../lib/authz-shared";
import { requireApp } from "../lib/payment/entitlements";
import {
  acceptUberOrder,
  activateUberStore,
  bindUberStore,
  denyUberOrder,
  setUberOrderManager,
  clearUberProvision,
  deleteUberRows,
  disableUberIntegration,
  getUberStoreStatus,
  isUberEatsConfigured,
  listUberStores,
  readUberStore,
  setUberStoreStatus,
  syncUberOrder,
  syncUberStore,
  toTRPC,
  uberAuthorizeUrl,
  uberProvisionFor,
  uberStoreFor,
  withAppToken,
} from "../lib/uber-eats";
import {
  DENY_CODES,
  PAUSE_CHOICES,
  SOLD_ORDER_STATES,
  STORE_SCOPES,
  estimatePayout,
  mapOrderDetail,
  mapStore,
  mapStoreStatus,
  nextMidnightIn,
  pauseUntil,
  percentToBps,
  signUberState,
  uberEnv,
  type PayoutInputs,
} from "../lib/uber-eats-shared";
import { rateLimit } from "../middleware/rate-limit";

// Uber Eats app: the owner connects their store through Uber's OAuth
// (apps/api /api/uber-eats/callback finishes it), orders arrive by webhook,
// and this router shows them and pauses/resumes the store. Read-only on
// orders: the restaurant still accepts them on Uber's tablet.
const appGate = <T extends { user: { email: string; role?: string | null }; projectId: string }>(ctx: T) =>
  requireApp(ctx.user, ctx.projectId, "uber-eats");
const appCmsProcedure = cmsProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});
const appCmsFullAccessProcedure = cmsFullAccessProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});
// Staff (content editors and up) accept and deny orders; the owner turns that on.
const appCmsWriteProcedure = cmsWriteProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});
// Admin-only: attaching a store Uber provisioned straight to the app (sandbox
// test stores, or a merchant who added the agency in Uber Eats Manager).
const appAdminProcedure = appCmsFullAccessProcedure.use(async ({ ctx, next }) => {
  if (!isAdminUser(ctx.user)) throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});

const PAGE_SIZE = 50;
// Each status change is a call to Uber on the client's live store.
const STATUS_LIMIT = { max: 10, windowMs: 10 * 60 * 1000, scope: "uber-eats" };

const notConfigured = () =>
  new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Uber Eats isn't set up yet. Contact support.",
  });

const notOrderManager = () =>
  new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Turn on \"Accept orders in Client Hub\" on the store card first.",
  });

const needStore = async (projectId: string) => {
  const store = await uberStoreFor(projectId);
  if (!store) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect your Uber Eats store first." });
  return store;
};

const storeOut = (s: NonNullable<Awaited<ReturnType<typeof uberStoreFor>>>) => ({
  storeId: s.storeId,
  name: s.name,
  address: s.address,
  timezone: s.timezone,
  webUrl: s.webUrl,
  listingStatus: s.listingStatus,
  onlineStatus: s.onlineStatus,
  pausedUntil: s.pausedUntil?.toISOString() ?? null,
  offlineReason: s.offlineReason,
  integrationEnabled: s.integrationEnabled,
  commissionBps: s.commissionBps,
  isOrderManager: s.isOrderManager,
  lastSyncedAt: s.lastSyncedAt?.toISOString() ?? null,
  lastError: s.lastError,
});

const DAY_MS = 24 * 60 * 60_000;

export const uberEatsRouter = createTRPCRouter({
  /** The connected store (null = not connected) and, mid-connect, the stores to pick from. */
  get: appCmsProcedure.query(async ({ ctx }) => {
    const [store, provision] = await Promise.all([
      uberStoreFor(ctx.projectId),
      uberProvisionFor(ctx.projectId),
    ]);
    return {
      configured: isUberEatsConfigured(),
      env: uberEnv(process.env.UBER_EATS_ENV),
      store: store ? storeOut(store) : null,
      pending: !store && provision ? provision.stores : null,
    };
  }),

  /** Orders today / 7 days / 30 days, sales and the payout estimate, from the orders saved here. */
  stats: appCmsProcedure.query(async ({ ctx }) => {
    const store = await uberStoreFor(ctx.projectId);
    if (!store) return null;
    const now = new Date();
    const today = new Date(nextMidnightIn(store.timezone, now).getTime() - DAY_MS);
    const week = new Date(now.getTime() - 7 * DAY_MS);
    const month = new Date(now.getTime() - 30 * DAY_MS);
    const sold = inArray(hubUberOrder.state, SOLD_ORDER_STATES);
    const inMonth = sql`${hubUberOrder.placedAt} >= ${month} and ${sold}`;
    // Same formula as estimatePayout, per order, summed: base = subtotal − promo;
    // commission = base × rate; payout = base − commission + merchant tax + merchant fees + tip − Uber fee.
    const bps = store.commissionBps;
    const base = sql`greatest(0, coalesce(${hubUberOrder.subtotalCents}, 0) - coalesce(${hubUberOrder.merchantPromoCents}, 0))`;
    const commission = bps == null ? sql`null` : sql`round(${base} * ${bps} / 10000.0)`;
    const payout =
      bps == null
        ? sql`null`
        : sql`${base} - ${commission} + coalesce(${hubUberOrder.taxMerchantCents}, 0) + coalesce(${hubUberOrder.merchantFeeCents}, 0) + coalesce(${hubUberOrder.tipCents}, 0) - coalesce(${hubUberOrder.uberFeeCents}, 0)`;
    const [row] = await db
      .select({
        today: sql<number>`count(*) filter (where ${hubUberOrder.placedAt} >= ${today} and ${sold})::int`,
        week: sql<number>`count(*) filter (where ${hubUberOrder.placedAt} >= ${week} and ${sold})::int`,
        month: sql<number>`count(*) filter (where ${inMonth})::int`,
        salesMonthCents: sql<number>`coalesce(sum(${hubUberOrder.totalCents}) filter (where ${inMonth}), 0)::int`,
        merchantPromoMonthCents: sql<number>`coalesce(sum(${hubUberOrder.merchantPromoCents}) filter (where ${inMonth}), 0)::int`,
        estCommissionMonthCents: sql<number | null>`(sum(${commission}) filter (where ${inMonth}))::int`,
        estPayoutMonthCents: sql<number | null>`(sum(${payout}) filter (where ${inMonth}))::int`,
        total: sql<number>`count(*)::int`,
        currency: sql<string | null>`max(${hubUberOrder.currency})`,
      })
      .from(hubUberOrder)
      .where(eq(hubUberOrder.projectId, ctx.projectId));
    return {
      today: row?.today ?? 0,
      week: row?.week ?? 0,
      month: row?.month ?? 0,
      salesMonthCents: row?.salesMonthCents ?? 0,
      merchantPromoMonthCents: row?.merchantPromoMonthCents ?? 0,
      estCommissionMonthCents: bps == null ? null : (row?.estCommissionMonthCents ?? 0),
      estPayoutMonthCents: bps == null ? null : (row?.estPayoutMonthCents ?? 0),
      commissionBps: bps,
      total: row?.total ?? 0,
      currency: row?.currency ?? null,
    };
  }),

  /**
   * One order, read live from Uber (items with options, instructions, the
   * courier) and shown, not stored. Falls back to the saved row when Uber
   * can't be reached.
   */
  order: appCmsProcedure.input(z.object({ id: z.string().min(1).max(100) })).query(async ({ ctx, input }) => {
    const [store, saved] = await Promise.all([
      uberStoreFor(ctx.projectId),
      db.query.hubUberOrder.findFirst({
        where: and(eq(hubUberOrder.id, input.id), eq(hubUberOrder.projectId, ctx.projectId)),
      }),
    ]);
    if (!store || !saved) throw new TRPCError({ code: "NOT_FOUND" });
    const storeInfo = { name: store.name, address: store.address, timezone: store.timezone };
    const estimate = (x: Omit<PayoutInputs, "commissionBps">) =>
      estimatePayout({ ...x, commissionBps: store.commissionBps });

    if (isUberEatsConfigured()) {
      try {
        const { raw } = await syncUberOrder(ctx.projectId, store.storeId, input.id);
        const detail = mapOrderDetail(raw);
        return {
          live: true as const,
          liveError: null,
          store: storeInfo,
          ...detail,
          placedAt: detail.placedAt.toISOString(),
          readyAt: detail.readyAt?.toISOString() ?? null,
          courier: detail.courier ? { ...detail.courier, etaPickup: detail.courier.etaPickup?.toISOString() ?? null } : null,
          estimate: estimate(detail),
        };
      } catch (error) {
        console.error("[uber-eats] live order read failed", input.id, error);
      }
    }
    return {
      live: false as const,
      liveError: "Uber Eats didn't answer. Showing what was saved when the order came in.",
      store: storeInfo,
      id: saved.id,
      storeId: saved.storeId,
      displayId: saved.displayId,
      state: saved.state,
      type: saved.type,
      placedAt: saved.placedAt.toISOString(),
      readyAt: saved.readyAt?.toISOString() ?? null,
      eaterFirstName: saved.eaterFirstName,
      items: saved.items,
      itemCount: saved.itemCount,
      subtotalCents: saved.subtotalCents,
      taxCents: saved.taxCents,
      totalCents: saved.totalCents,
      currency: saved.currency,
      merchantPromoCents: saved.merchantPromoCents,
      merchantFeeCents: saved.merchantFeeCents,
      tipCents: saved.tipCents,
      uberFeeCents: saved.uberFeeCents,
      taxMerchantCents: saved.taxMerchantCents,
      lines: saved.items.map((i) => ({ ...i, unitCents: null, totalCents: null, instructions: null, modifiers: [] })),
      specialInstructions: null,
      charges: {
        subtotalCents: saved.subtotalCents,
        promoCents: saved.merchantPromoCents,
        taxCents: saved.taxCents,
        serviceFeeCents: saved.merchantFeeCents,
        deliveryFeeCents: null,
        smallOrderFeeCents: null,
        bagFeeCents: null,
        tipCents: saved.tipCents,
        totalCents: saved.totalCents,
        cashDueCents: null,
      },
      courier: null,
      estimate: estimate(saved),
    };
  }),

  /**
   * Accept a new order on Uber from the hub. Needs the store's "accept here"
   * switch (the hub as order manager); Uber refuses otherwise.
   */
  acceptOrder: appCmsWriteProcedure
    .input(z.object({ id: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      if (!isUberEatsConfigured()) throw notConfigured();
      const store = await needStore(ctx.projectId);
      if (!store.isOrderManager) throw notOrderManager();
      const saved = await db.query.hubUberOrder.findFirst({
        where: and(eq(hubUberOrder.id, input.id), eq(hubUberOrder.projectId, ctx.projectId)),
      });
      if (!saved) throw new TRPCError({ code: "NOT_FOUND" });
      try {
        await acceptUberOrder(input.id);
      } catch (error) {
        throw toTRPC(error, "Uber Eats didn't take the acceptance. Try the tablet.");
      }
      const { mapped } = await syncUberOrder(ctx.projectId, store.storeId, input.id).catch(() => ({ mapped: null }));
      return { state: mapped?.state ?? "ACCEPTED" };
    }),

  denyOrder: appCmsWriteProcedure
    .input(z.object({ id: z.string().min(1).max(100), code: z.enum(DENY_CODES), explanation: z.string().trim().min(1).max(300) }))
    .mutation(async ({ ctx, input }) => {
      if (!isUberEatsConfigured()) throw notConfigured();
      const store = await needStore(ctx.projectId);
      if (!store.isOrderManager) throw notOrderManager();
      const saved = await db.query.hubUberOrder.findFirst({
        where: and(eq(hubUberOrder.id, input.id), eq(hubUberOrder.projectId, ctx.projectId)),
      });
      if (!saved) throw new TRPCError({ code: "NOT_FOUND" });
      try {
        await denyUberOrder(input.id, input.code, input.explanation);
      } catch (error) {
        throw toTRPC(error, "Uber Eats didn't take the denial. Try the tablet.");
      }
      const { mapped } = await syncUberOrder(ctx.projectId, store.storeId, input.id).catch(() => ({ mapped: null }));
      return { state: mapped?.state ?? "DENIED" };
    }),

  /**
   * Owner switch: make the hub the store's order manager on Uber (accept /
   * deny here), or hand that back. Uber must take the change first.
   */
  setOrderManager: appCmsFullAccessProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!isUberEatsConfigured()) throw notConfigured();
      const store = await needStore(ctx.projectId);
      try {
        await setUberOrderManager(store.storeId, input.enabled);
      } catch (error) {
        throw toTRPC(error, "Uber Eats didn't accept the change. Reconnect the store and try again.");
      }
      await db
        .update(hubUberStore)
        .set({ isOrderManager: input.enabled, updatedAt: new Date() })
        .where(eq(hubUberStore.id, store.id));
      return { ok: true };
    }),

  /** The owner's Uber commission rate, for the payout estimates. */
  setCommission: appCmsFullAccessProcedure
    .input(z.object({ percent: z.number().min(0).max(100).nullable() }))
    .mutation(async ({ ctx, input }) => {
      const store = await needStore(ctx.projectId);
      await db
        .update(hubUberStore)
        .set({ commissionBps: input.percent == null ? null : percentToBps(input.percent), updatedAt: new Date() })
        .where(eq(hubUberStore.id, store.id));
      return { ok: true };
    }),

  orders: appCmsProcedure
    .input(z.object({ cursor: z.string().datetime().optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(hubUberOrder)
        .where(
          and(
            eq(hubUberOrder.projectId, ctx.projectId),
            input.cursor ? lt(hubUberOrder.placedAt, new Date(input.cursor)) : undefined
          )
        )
        .orderBy(desc(hubUberOrder.placedAt))
        .limit(PAGE_SIZE + 1);
      const page = rows.slice(0, PAGE_SIZE);
      return {
        items: page.map((o) => ({
          id: o.id,
          displayId: o.displayId,
          state: o.state,
          type: o.type,
          placedAt: o.placedAt.toISOString(),
          readyAt: o.readyAt?.toISOString() ?? null,
          eaterFirstName: o.eaterFirstName,
          items: o.items,
          itemCount: o.itemCount,
          totalCents: o.totalCents,
          currency: o.currency,
        })),
        nextCursor: rows.length > PAGE_SIZE ? page[page.length - 1]!.placedAt.toISOString() : null,
      };
    }),

  /** Uber's consent screen; the api callback finishes the connection. */
  connectUrl: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    if (!isUberEatsConfigured()) throw notConfigured();
    const state = signUberState(
      { projectId: ctx.projectId, userId: ctx.user.id },
      process.env.BETTER_AUTH_SECRET ?? ""
    );
    return { url: uberAuthorizeUrl(state) };
  }),

  /** The owner has more than one store: activate the hub on the chosen one. */
  activate: appCmsFullAccessProcedure
    .input(z.object({ storeId: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      if (!isUberEatsConfigured()) throw notConfigured();
      const provision = await uberProvisionFor(ctx.projectId);
      if (!provision || !provision.stores.some((s) => s.storeId === input.storeId)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "That connection expired. Press Connect Uber Eats again.",
        });
      }
      const taken = await db.query.hubUberStore.findFirst({
        where: eq(hubUberStore.storeId, input.storeId),
      });
      if (taken && taken.projectId !== ctx.projectId) {
        throw new TRPCError({ code: "CONFLICT", message: "That store is already connected to another project." });
      }
      try {
        await activateUberStore(provision.token, input.storeId, ctx.projectId);
        const { store, status } = await readUberStore(input.storeId);
        await bindUberStore(ctx.projectId, ctx.user.id, store, status);
      } catch (error) {
        throw toTRPC(error, "Couldn't connect that store. Try again.");
      }
      await clearUberProvision(ctx.projectId);
      return { ok: true };
    }),

  /** Pause (with an end time) or bring the store back online. */
  setStatus: appCmsFullAccessProcedure
    .input(
      z.discriminatedUnion("status", [
        z.object({ status: z.literal("ONLINE") }),
        z.object({
          status: z.literal("PAUSED"),
          duration: z.enum(PAUSE_CHOICES),
          reason: z.string().trim().max(200).optional(),
        }),
      ])
    )
    .mutation(async ({ ctx, input }) => {
      if (!isUberEatsConfigured()) throw notConfigured();
      const store = await needStore(ctx.projectId);
      await rateLimit(STATUS_LIMIT.max, STATUS_LIMIT.windowMs, STATUS_LIMIT.scope);
      const pausedUntil = input.status === "PAUSED" ? pauseUntil(input.duration, store.timezone) : null;
      try {
        const status = await withAppToken(STORE_SCOPES, async (token) => {
          await setUberStoreStatus(token, store.storeId, {
            status: input.status,
            pausedUntil,
            reason: input.status === "PAUSED" ? input.reason || "Paused from Client Hub" : null,
          });
          return getUberStoreStatus(token, store.storeId).catch(() => null);
        });
        await db
          .update(hubUberStore)
          .set({
            ...(status
              ? mapStoreStatus(status)
              : {
                  onlineStatus: input.status,
                  pausedUntil,
                  offlineReason: input.status === "PAUSED" ? input.reason || null : null,
                }),
            lastSyncedAt: new Date(),
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(hubUberStore.id, store.id));
      } catch (error) {
        throw toTRPC(error, "Uber Eats didn't take the change. Try again.");
      }
      return { ok: true };
    }),

  /** Re-read the store and its status now. */
  refresh: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    if (!isUberEatsConfigured()) throw notConfigured();
    const store = await needStore(ctx.projectId);
    await rateLimit(STATUS_LIMIT.max, STATUS_LIMIT.windowMs, STATUS_LIMIT.scope);
    const result = await syncUberStore(store);
    if (!result.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: result.error });
    return { ok: true };
  }),

  /** Unbind the store and delete the saved orders. */
  disconnect: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    const store = await uberStoreFor(ctx.projectId);
    if (store && isUberEatsConfigured()) {
      await disableUberIntegration(store.storeId).catch((error) =>
        console.error("[uber-eats] disable integration failed", store.storeId, error)
      );
    }
    await deleteUberRows([ctx.projectId]);
    return { ok: true };
  }),

  /** Admin: the stores Uber has provisioned to the agency app itself. */
  appStores: appAdminProcedure.query(async () => {
    if (!isUberEatsConfigured()) throw notConfigured();
    try {
      const stores = await withAppToken(STORE_SCOPES, listUberStores);
      const bound = stores.length
        ? await db
            .select({ storeId: hubUberStore.storeId, projectId: hubUberStore.projectId })
            .from(hubUberStore)
            .where(inArray(hubUberStore.storeId, stores.map((s) => s.store_id)))
        : [];
      const boundBy = new Map(bound.map((b) => [b.storeId, b.projectId]));
      return stores.map((s) => ({
        ...mapStore(s),
        boundToProjectId: boundBy.get(s.store_id) ?? null,
      }));
    } catch (error) {
      throw toTRPC(error, "Couldn't list the app's stores.");
    }
  }),

  /** Admin: bind one of those stores to this project, no merchant login. */
  attachStore: appAdminProcedure
    .input(z.object({ storeId: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      if (!isUberEatsConfigured()) throw notConfigured();
      const taken = await db.query.hubUberStore.findFirst({
        where: eq(hubUberStore.storeId, input.storeId),
      });
      if (taken && taken.projectId !== ctx.projectId) {
        throw new TRPCError({ code: "CONFLICT", message: "That store is already connected to another project." });
      }
      try {
        const { store, status } = await readUberStore(input.storeId);
        await bindUberStore(ctx.projectId, ctx.user.id, store, status);
      } catch (error) {
        throw toTRPC(error, "Couldn't attach that store.");
      }
      await clearUberProvision(ctx.projectId);
      return { ok: true };
    }),
});
