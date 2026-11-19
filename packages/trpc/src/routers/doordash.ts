import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import { hubDoorDashStore, hubProject } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, cmsProcedure, createTRPCRouter } from "../init";
import { isAdminUser } from "../lib/authz-shared";
import { requireApp } from "../lib/payment/entitlements";
import {
  bindDoorDashStore,
  clearDoorDashProvision,
  deleteDoorDashRows,
  doordashAuthorizeUrl,
  doordashProvisionFor,
  doordashStoreFor,
  isDoorDashConfigured,
  refreshDoorDashStore,
  resetStoreOnboarding,
  startStoreOnboarding,
  toTRPC,
} from "../lib/doordash";
import { canRestart, isFinalStatus } from "../lib/doordash-constants";
import { doordashEnv, signDoorDashState } from "../lib/doordash-shared";
import { rateLimit } from "../middleware/rate-limit";

// DoorDash app, phase 1: the owner signs in at DoorDash (apps/api
// /api/doordash/callback finishes it), picks a store, and we ask DoorDash to
// onboard it. DoorDash's status webhooks drive the card from there. No menu,
// orders or activation yet.
const appGate = <T extends { user: { email: string; role?: string | null }; projectId: string }>(ctx: T) =>
  requireApp(ctx.user, ctx.projectId, "doordash");
const appCmsProcedure = cmsProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});
const appCmsFullAccessProcedure = cmsFullAccessProcedure.use(async ({ ctx, next }) => {
  await appGate(ctx);
  return next();
});
const appAdminProcedure = appCmsFullAccessProcedure.use(async ({ ctx, next }) => {
  if (!isAdminUser(ctx.user)) throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});

// Each of these is a call to DoorDash about the client's store.
const REMOTE_LIMIT = { max: 10, windowMs: 10 * 60 * 1000, scope: "doordash" };

const notConfigured = () =>
  new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "DoorDash isn't set up yet. Contact support.",
  });

const needStore = async (projectId: string) => {
  const store = await doordashStoreFor(projectId);
  if (!store) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect your DoorDash store first." });
  return store;
};

const storeOut = (s: NonNullable<Awaited<ReturnType<typeof doordashStoreFor>>>) => ({
  storeId: s.storeId,
  name: s.name,
  address: s.address,
  businessName: s.businessName,
  onboardingId: s.onboardingId,
  onboardingStatus: s.onboardingStatus,
  exclusionCode: s.exclusionCode,
  statusDetails: s.statusDetails,
  menuPreviewUrl: s.menuPreviewUrl,
  decisionMakerEmail: s.decisionMakerEmail,
  lastEventAt: s.lastEventAt?.toISOString() ?? null,
  lastError: s.lastError,
  canRestart: canRestart(s.onboardingStatus),
  final: isFinalStatus(s.onboardingStatus),
});

/** What DoorDash shows the merchant as the partner's store: the hub's name + address for the business. */
const providerStore = async (projectId: string, fallbackName: string) => {
  const [project] = await db
    .select({ name: hubProject.name, address: hubProject.address, websiteUrl: hubProject.websiteUrl })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  const host = project?.websiteUrl ? new URL(project.websiteUrl).hostname.replace(/^www\./, "") : null;
  return { name: project?.name?.trim() || host || fallbackName, address: project?.address?.trim() || null };
};

export const doordashRouter = createTRPCRouter({
  /** The connected store (null = not connected) and, mid-connect, the stores to pick from. */
  get: appCmsProcedure.query(async ({ ctx }) => {
    const [store, provision] = await Promise.all([
      doordashStoreFor(ctx.projectId),
      doordashProvisionFor(ctx.projectId),
    ]);
    return {
      configured: isDoorDashConfigured(),
      env: doordashEnv(process.env.DOORDASH_ENV),
      store: store ? storeOut(store) : null,
      pending: provision ? provision.stores : null,
    };
  }),

  /** DoorDash's sign-in screen; the api callback finishes the connection. */
  connectUrl: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    if (!isDoorDashConfigured()) throw notConfigured();
    const state = signDoorDashState(
      { projectId: ctx.projectId, userId: ctx.user.id },
      process.env.BETTER_AUTH_SECRET ?? ""
    );
    return { url: doordashAuthorizeUrl(state) };
  }),

  /** The owner picked a store: ask DoorDash to onboard it to the hub. */
  startOnboarding: appCmsFullAccessProcedure
    .input(
      z.object({
        storeId: z.string().min(1).max(100),
        decisionMakerEmail: z.string().trim().email().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isDoorDashConfigured()) throw notConfigured();
      const provision = await doordashProvisionFor(ctx.projectId);
      const candidate = provision?.stores.find((s) => s.storeId === input.storeId);
      if (!provision || !candidate) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "That sign-in expired. Press Connect DoorDash again.",
        });
      }
      if (!candidate.eligible) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "DoorDash says that store can't be connected." });
      }
      const taken = await db.query.hubDoorDashStore.findFirst({
        where: eq(hubDoorDashStore.storeId, input.storeId),
      });
      if (taken && taken.projectId !== ctx.projectId) {
        throw new TRPCError({ code: "CONFLICT", message: "That store is already connected to another project." });
      }
      await rateLimit(REMOTE_LIMIT.max, REMOTE_LIMIT.windowMs, REMOTE_LIMIT.scope);
      const email = input.decisionMakerEmail || null;
      try {
        const provider = await providerStore(ctx.projectId, candidate.name);
        const onboardingId = await startStoreOnboarding(provision.token, {
          storeId: candidate.storeId,
          locationId: ctx.projectId,
          name: provider.name,
          address: provider.address ?? candidate.address,
          email,
        });
        await bindDoorDashStore(ctx.projectId, ctx.user.id, candidate, onboardingId, email);
      } catch (error) {
        throw toTRPC(error, "DoorDash didn't accept the request. Try again.");
      }
      await clearDoorDashProvision(ctx.projectId);
      return { ok: true };
    }),

  /** Re-read the onboarding job from DoorDash now (webhooks do this on their own). */
  refresh: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    if (!isDoorDashConfigured()) throw notConfigured();
    const store = await needStore(ctx.projectId);
    await rateLimit(REMOTE_LIMIT.max, REMOTE_LIMIT.windowMs, REMOTE_LIMIT.scope);
    const result = await refreshDoorDashStore(store);
    if (!result.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: result.error });
    return { ok: true };
  }),

  /**
   * Start the job over. DoorDash needs the merchant signed in again for that,
   * so this returns the sign-in URL; the callback posts the new request.
   */
  restart: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    if (!isDoorDashConfigured()) throw notConfigured();
    const store = await needStore(ctx.projectId);
    if (!canRestart(store.onboardingStatus)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "DoorDash is still working on the current request. Press Refresh in a few minutes.",
      });
    }
    const state = signDoorDashState(
      { projectId: ctx.projectId, userId: ctx.user.id, restart: true },
      process.env.BETTER_AUTH_SECRET ?? ""
    );
    return { url: doordashAuthorizeUrl(state) };
  }),

  /** Forget the store here. DoorDash keeps the request until it's abandoned. */
  disconnect: appCmsFullAccessProcedure.mutation(async ({ ctx }) => {
    await deleteDoorDashRows([ctx.projectId]);
    return { ok: true };
  }),

  /** Admin, test environments only: DoorDash forgets the job and the project is unlinked. */
  resetOnboarding: appAdminProcedure.mutation(async ({ ctx }) => {
    if (!isDoorDashConfigured()) throw notConfigured();
    if (doordashEnv(process.env.DOORDASH_ENV) === "production") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Reset is only for test stores." });
    }
    const store = await needStore(ctx.projectId);
    if (store.onboardingId) {
      try {
        await resetStoreOnboarding(store.onboardingId);
      } catch (error) {
        throw toTRPC(error, "DoorDash didn't reset the request.");
      }
    }
    await deleteDoorDashRows([ctx.projectId]);
    return { ok: true };
  }),
});
