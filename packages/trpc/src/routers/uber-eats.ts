import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import { hubUberOrder, hubUberStore } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import { isAdminUser } from "../lib/authz-shared";
import { requireApp } from "../lib/payment/entitlements";
import {
  activateUberStore,
  bindUberStore,
  clearUberProvision,
  deleteUberRows,
  disableUberIntegration,
  getUberStore,
  getUberStoreStatus,
  isUberEatsConfigured,
  listUberStores,
  setUberStoreStatus,
  syncUberStore,
  toTRPC,
  uberAuthorizeUrl,
  uberProvisionFor,
  uberStoreFor,
  uberTokenFor,
} from "../lib/uber-eats";
import {
  PAUSE_CHOICES,
  SOLD_ORDER_STATES,
  STORE_SCOPES,
  mapStore,
  mapStoreStatus,
  nextMidnightIn,
  pauseUntil,
  signUberState,
  uberEnv,
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

  /** Orders today / 7 days / 30 days and sales, from the orders saved here. */
  stats: appCmsProcedure.query(async ({ ctx }) => {
    const store = await uberStoreFor(ctx.projectId);
    if (!store) return null;
    const now = new Date();
    const today = new Date(nextMidnightIn(store.timezone, now).getTime() - DAY_MS);
    const week = new Date(now.getTime() - 7 * DAY_MS);
    const month = new Date(now.getTime() - 30 * DAY_MS);
    const sold = inArray(hubUberOrder.state, SOLD_ORDER_STATES);
    const [row] = await db
      .select({
        today: sql<number>`count(*) filter (where ${hubUberOrder.placedAt} >= ${today} and ${sold})::int`,
        week: sql<number>`count(*) filter (where ${hubUberOrder.placedAt} >= ${week} and ${sold})::int`,
        month: sql<number>`count(*) filter (where ${hubUberOrder.placedAt} >= ${month} and ${sold})::int`,
        salesMonthCents: sql<number>`coalesce(sum(${hubUberOrder.totalCents}) filter (where ${hubUberOrder.placedAt} >= ${month} and ${sold}), 0)::int`,
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
      total: row?.total ?? 0,
      currency: row?.currency ?? null,
    };
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
        const token = await uberTokenFor(STORE_SCOPES);
        const [store, status] = await Promise.all([
          getUberStore(token, input.storeId),
          getUberStoreStatus(token, input.storeId).catch(() => null),
        ]);
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
        const token = await uberTokenFor(STORE_SCOPES);
        await setUberStoreStatus(token, store.storeId, {
          status: input.status,
          pausedUntil,
          reason: input.status === "PAUSED" ? input.reason || "Paused from Client Hub" : null,
        });
        const status = await getUberStoreStatus(token, store.storeId).catch(() => null);
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
      const token = await uberTokenFor(STORE_SCOPES);
      const stores = await listUberStores(token);
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
        const token = await uberTokenFor(STORE_SCOPES);
        const [store, status] = await Promise.all([
          getUberStore(token, input.storeId),
          getUberStoreStatus(token, input.storeId).catch(() => null),
        ]);
        await bindUberStore(ctx.projectId, ctx.user.id, store, status);
      } catch (error) {
        throw toTRPC(error, "Couldn't attach that store.");
      }
      await clearUberProvision(ctx.projectId);
      return { ok: true };
    }),
});
