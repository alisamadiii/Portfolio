import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { lead, leadCreditLedger, leadScan } from "@workspace/drizzle/schema";
import type { LeadStatus } from "@workspace/drizzle/schema";

import { authenticatedProcedure, baseProcedure, createTRPCRouter } from "../init";
import {
  debitCredits,
  ensureSignupGrant,
  getCreditBalance,
} from "../lib/credits";
import { inspectSite } from "../lib/inspect";
import {
  distanceMiles,
  isSocialOnly,
  isWebsiteDead,
  searchPlaces,
} from "../lib/places";
import { rateLimit } from "../middleware/rate-limit";

// Home base for near-me scans (566 Kit St, Jacksonville FL 32216).
// Admin-only — regular users must pick a city.
const HOME = {
  lat: 30.3048973,
  lng: -81.5660117,
  city: "Jacksonville",
  state: "FL",
  radiusMeters: 15_000, // bias circle ~9 mi
  maxMiles: 12, // hard cutoff — close enough to drive to
};

// Global circuit breaker on Google spend — paying users fund calls now, so
// this is a budget guard, not a quota. Scans are blocked before the month's
// counted calls could cross it.
const MONTHLY_CALL_CAP = Number(process.env.GOOGLE_MONTHLY_CALL_CAP ?? 5000);
const CALLS_PER_SCAN = 3; // worst case: 3 paginated requests

async function monthApiCalls(): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [usage] = await db
    .select({ calls: sql<number>`coalesce(sum(${leadScan.apiCalls}), 0)` })
    .from(leadScan)
    .where(gte(leadScan.createdAt, monthStart));
  return Number(usage?.calls ?? 0);
}

const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "won",
  "lost",
] as const;

function scoreLead(input: {
  noWebsite: boolean;
  socialOnly: boolean;
  websiteDead: boolean;
  phone: boolean;
  rating: number | null;
  reviewCount: number;
}): number {
  let score = 0;
  if (input.noWebsite) score += 40;
  else if (input.socialOnly) score += 30;
  else if (input.websiteDead) score += 30;
  if (input.phone) score += 20;
  if (input.rating !== null) {
    if (input.rating >= 4) score += 15;
    else if (input.rating >= 3) score += 10;
  }
  if (input.reviewCount >= 20) score += 15;
  else if (input.reviewCount >= 5) score += 10;
  return score;
}

// A billable prospect — what 1 credit buys. Businesses with a healthy
// website are shown free; they're not what anyone pays for.
function isBillable(l: {
  website: string | null;
  socialOnly: boolean;
  websiteDead: boolean;
}): boolean {
  return !l.website || l.socialOnly || l.websiteDead;
}

// Every signed-in leads user gets the lazy 25-credit signup grant
// (idempotent via the ledger's partial unique index).
const leadsUserProcedure = authenticatedProcedure.use(async ({ next, ctx }) => {
  await ensureSignupGrant(ctx.session.user.id);
  return next({ ctx });
});

// Fields a locked row is allowed to expose. Contact info stays server-side
// until the lead is unlocked — never ship it masked-by-CSS.
function maskLockedLead(l: typeof lead.$inferSelect) {
  return {
    id: l.id,
    scanId: l.scanId,
    locked: true as const,
    name: null,
    address: null,
    phone: null,
    website: null,
    socialOnly: l.socialOnly,
    websiteDead: l.websiteDead,
    distanceMiles: l.distanceMiles,
    rating: l.rating,
    reviewCount: l.reviewCount,
    mapsUrl: null,
    category: l.category,
    score: l.score,
    status: l.status,
    notes: null,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

export const leadsRouter = createTRPCRouter({
  scan: createTRPCRouter({
    run: leadsUserProcedure
      .input(
        z
          .object({
            niche: z.string().min(2).max(80),
            city: z.string().max(80).optional(),
            state: z.string().max(40).optional(),
            nearMe: z.boolean().default(false),
          })
          .refine((data) => data.nearMe || (data.city && data.state), {
            message: "City and state are required unless scanning near me",
          })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.session.user.id;
        const isAdmin = ctx.session.user.role === "admin";

        if (input.nearMe && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Near-me scans are not available. Pick a city instead.",
          });
        }

        // Hard stop before the global spend cap can be crossed — a scan may
        // use up to CALLS_PER_SCAN requests, so reserve that much headroom.
        const used = await monthApiCalls();
        if (used + CALLS_PER_SCAN > MONTHLY_CALL_CAP) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Scanning is temporarily paused this month. Please try again after the 1st.",
          });
        }

        const balance = isAdmin ? Infinity : await getCreditBalance(userId);
        if (balance < 1) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "You're out of credits. Buy a credit pack to keep scanning.",
          });
        }

        const city = input.nearMe ? HOME.city : input.city!;
        const state = input.nearMe ? HOME.state : input.state!;
        const query = input.nearMe
          ? input.niche
          : `${input.niche} in ${city}, ${state}`;

        const [scan] = await db
          .insert(leadScan)
          .values({
            userId,
            query: input.niche,
            city,
            state,
            nearMe: input.nearMe,
          })
          .returning();
        if (!scan) throw new Error("Failed to create scan");

        try {
          const { places, apiCalls, error } = await searchPlaces(
            query,
            input.nearMe
              ? { lat: HOME.lat, lng: HOME.lng, radiusMeters: HOME.radiusMeters }
              : undefined
          );

          // Failed calls are still billed calls — persist the count, then bail.
          if (error) {
            await db
              .update(leadScan)
              .set({ status: "error", error, apiCalls })
              .where(eq(leadScan.id, scan.id));
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: error,
            });
          }

          let operational = places.filter(
            (p) => !p.businessStatus || p.businessStatus === "OPERATIONAL"
          );

          // Near-me: locationBias is a bias, not a filter — enforce the
          // drive-to radius ourselves.
          if (input.nearMe) {
            operational = operational.filter((p) => {
              const { latitude, longitude } = p.location ?? {};
              if (latitude === undefined || longitude === undefined)
                return false;
              return (
                distanceMiles(HOME, { lat: latitude, lng: longitude }) <=
                HOME.maxMiles
              );
            });
          }

          // Liveness-check real websites in parallel.
          const classified = await Promise.all(
            operational.map(async (p) => {
              const website = p.websiteUri ?? null;
              const socialOnly = website ? isSocialOnly(website) : false;
              const websiteDead =
                website && !socialOnly ? await isWebsiteDead(website) : false;
              return { place: p, website, socialOnly, websiteDead };
            })
          );

          // Leads this user already owns are refreshed for free — only
          // never-seen billable prospects cost credits.
          const placeIds = classified.map((c) => c.place.id);
          const owned =
            placeIds.length > 0
              ? await db
                  .select({ placeId: lead.placeId })
                  .from(lead)
                  .where(
                    and(
                      eq(lead.userId, userId),
                      inArray(lead.placeId, placeIds)
                    )
                  )
              : [];
          const ownedIds = new Set(owned.map((o) => o.placeId));

          const rows = classified.map((c) => {
            const noWebsite = !c.website;
            return {
              ...c,
              isNew: !ownedIds.has(c.place.id),
              billable: isBillable(c),
              score: scoreLead({
                noWebsite,
                socialOnly: c.socialOnly,
                websiteDead: c.websiteDead,
                phone: !!c.place.nationalPhoneNumber,
                rating: c.place.rating ?? null,
                reviewCount: c.place.userRatingCount ?? 0,
              }),
            };
          });

          // Debit before insert: best prospects unlock first, the rest stay
          // locked until more credits are bought. Retry once on a lost race.
          const newBillable = rows
            .filter((r) => r.isNew && r.billable)
            .sort((a, b) => b.score - a.score);
          let unlockedCount = newBillable.length;
          if (!isAdmin && newBillable.length > 0) {
            let attempt = Math.min(balance, newBillable.length);
            let res = await debitCredits({
              userId,
              amount: attempt,
              reason: "scan",
              refId: String(scan.id),
            });
            if (!res.ok) {
              attempt = Math.max(0, Math.min(res.balance, newBillable.length));
              res =
                attempt > 0
                  ? await debitCredits({
                      userId,
                      amount: attempt,
                      reason: "scan",
                      refId: String(scan.id),
                    })
                  : { ok: false, balance: 0 };
              if (!res.ok) attempt = 0;
            }
            unlockedCount = attempt;
          }
          const unlockedIds = new Set(
            newBillable.slice(0, unlockedCount).map((r) => r.place.id)
          );

          let noWebsiteCount = 0;
          for (const r of rows) {
            if (r.billable) noWebsiteCount++;

            const values = {
              userId,
              scanId: scan.id,
              placeId: r.place.id,
              name: r.place.displayName?.text ?? "Unknown",
              address: r.place.formattedAddress ?? null,
              phone: r.place.nationalPhoneNumber ?? null,
              website: r.website,
              socialOnly: r.socialOnly,
              websiteDead: r.websiteDead,
              distanceMiles:
                input.nearMe && r.place.location?.latitude !== undefined
                  ? Math.round(
                      distanceMiles(HOME, {
                        lat: r.place.location.latitude!,
                        lng: r.place.location.longitude!,
                      }) * 10
                    ) / 10
                  : null,
              rating: r.place.rating ?? null,
              reviewCount: r.place.userRatingCount ?? 0,
              mapsUrl: r.place.googleMapsUri ?? null,
              category:
                r.place.primaryTypeDisplayName?.text ??
                r.place.types?.[0] ??
                null,
              score: r.score,
            };

            // Re-scans refresh place data but must NEVER touch unlocked,
            // status, or notes — those are user-owned state the upsert's
            // `set` deliberately excludes.
            await db
              .insert(lead)
              .values({
                ...values,
                unlocked:
                  !r.billable || unlockedIds.has(r.place.id) || !r.isNew,
              })
              .onConflictDoUpdate({
                target: [lead.userId, lead.placeId],
                set: { ...values, updatedAt: new Date() },
              });
          }

          await db
            .update(leadScan)
            .set({
              status: "done",
              totalFound: operational.length,
              noWebsiteCount,
              apiCalls,
            })
            .where(eq(leadScan.id, scan.id));

          const lockedCount = newBillable.length - unlockedCount;
          return {
            scanId: scan.id,
            totalFound: operational.length,
            noWebsiteCount,
            newLeads: rows.filter((r) => r.isNew).length,
            lockedCount,
            balance: isAdmin ? null : await getCreditBalance(userId),
          };
        } catch (error) {
          await db
            .update(leadScan)
            .set({
              status: "error",
              error: error instanceof Error ? error.message : String(error),
            })
            .where(eq(leadScan.id, scan.id));
          throw error;
        }
      }),

    list: leadsUserProcedure.query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const isAdmin = ctx.session.user.role === "admin";

      const scans = await db
        .select()
        .from(leadScan)
        .where(eq(leadScan.userId, userId))
        .orderBy(desc(leadScan.createdAt))
        .limit(50);

      const balance = await getCreditBalance(userId);

      if (!isAdmin) return { scans, balance, isAdmin };

      // Global Google spend telemetry — admin eyes only.
      const used = await monthApiCalls();
      return {
        scans,
        balance,
        isAdmin,
        monthApiCalls: used,
        callCap: MONTHLY_CALL_CAP,
        scansLeft: Math.max(
          0,
          Math.floor((MONTHLY_CALL_CAP - used) / CALLS_PER_SCAN)
        ),
      };
    }),

    get: leadsUserProcedure
      .input(z.object({ scanId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [scan] = await db
          .select()
          .from(leadScan)
          .where(
            and(
              eq(leadScan.id, input.scanId),
              eq(leadScan.userId, ctx.session.user.id)
            )
          )
          .limit(1);
        return scan ?? null;
      }),
  }),

  list: leadsUserProcedure
    .input(
      z.object({
        scanId: z.number(),
        noWebsiteOnly: z.boolean().default(true),
        status: z.enum(LEAD_STATUSES).optional(),
        minRating: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const filters = [eq(lead.scanId, input.scanId), eq(lead.userId, userId)];
      if (input.noWebsiteOnly) {
        filters.push(
          or(
            isNull(lead.website),
            eq(lead.socialOnly, true),
            eq(lead.websiteDead, true)
          )!
        );
      }
      if (input.status) filters.push(eq(lead.status, input.status));
      if (input.minRating !== undefined)
        filters.push(gte(lead.rating, input.minRating));

      const [scan] = await db
        .select({ nearMe: leadScan.nearMe })
        .from(leadScan)
        .where(
          and(eq(leadScan.id, input.scanId), eq(leadScan.userId, userId))
        )
        .limit(1);

      const rows = await db
        .select()
        .from(lead)
        .where(and(...filters))
        .orderBy(
          // Near-me scans: closest first — the whole point is driving over.
          ...(scan?.nearMe
            ? [sql`${lead.distanceMiles} asc nulls last`, desc(lead.score)]
            : [desc(lead.score), desc(lead.reviewCount)])
        );

      const [locked] = await db
        .select({ count: sql<number>`count(*)` })
        .from(lead)
        .where(
          and(
            eq(lead.scanId, input.scanId),
            eq(lead.userId, userId),
            eq(lead.unlocked, false)
          )
        );

      return {
        leads: rows.map((l) =>
          l.unlocked ? { ...l, locked: false as const } : maskLockedLead(l)
        ),
        lockedCount: Number(locked?.count ?? 0),
      };
    }),

  // Spend credits to reveal locked leads in a scan, best-scored first.
  unlock: leadsUserProcedure
    .input(z.object({ scanId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const result = await db.transaction(async (tx) => {
        // Same per-user lock as debitCredits — serializes against concurrent
        // scans/unlocks so rows can't be paid for twice.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);

        const lockedRows = await tx
          .select({ id: lead.id })
          .from(lead)
          .where(
            and(
              eq(lead.scanId, input.scanId),
              eq(lead.userId, userId),
              eq(lead.unlocked, false)
            )
          )
          .orderBy(desc(lead.score), desc(lead.reviewCount));

        const [row] = await tx
          .select({
            balance: sql<number>`coalesce(sum(${leadCreditLedger.delta}), 0)`,
          })
          .from(leadCreditLedger)
          .where(eq(leadCreditLedger.userId, userId));
        const balance = Number(row?.balance ?? 0);

        const n = Math.min(Math.max(0, balance), lockedRows.length);
        if (n === 0) return { unlocked: 0, remainingLocked: lockedRows.length };

        const ids = lockedRows.slice(0, n).map((r) => r.id);
        await tx
          .update(lead)
          .set({ unlocked: true, updatedAt: new Date() })
          .where(inArray(lead.id, ids));
        await tx.insert(leadCreditLedger).values({
          userId,
          delta: -n,
          reason: "unlock",
          refId: String(input.scanId),
        });

        return { unlocked: n, remainingLocked: lockedRows.length - n };
      });

      if (result.unlocked === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "You're out of credits. Buy a credit pack to unlock leads.",
        });
      }
      return result;
    }),

  credits: createTRPCRouter({
    get: leadsUserProcedure.query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const [balance, ledger] = await Promise.all([
        getCreditBalance(userId),
        db
          .select()
          .from(leadCreditLedger)
          .where(eq(leadCreditLedger.userId, userId))
          .orderBy(desc(leadCreditLedger.createdAt))
          .limit(20),
      ]);
      return { balance, ledger };
    }),
  }),

  updateStatus: leadsUserProcedure
    .input(z.object({ id: z.number(), status: z.enum(LEAD_STATUSES) }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(lead)
        .set({ status: input.status as LeadStatus, updatedAt: new Date() })
        .where(
          and(
            eq(lead.id, input.id),
            eq(lead.userId, ctx.session.user.id),
            eq(lead.unlocked, true)
          )
        );
      return { success: true };
    }),

  // Fetches a site's HTML and reports vendors/scripts to port over.
  // No Google API involved — plain HTTP. Public, IP rate-limited.
  inspect: baseProcedure
    .input(z.object({ domain: z.string().min(3).max(255) }))
    .mutation(async ({ input }) => {
      await rateLimit(10, 10 * 60 * 1000);
      try {
        return await inspectSite(input.domain);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not fetch ${input.domain}: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        });
      }
    }),

  updateNotes: leadsUserProcedure
    .input(z.object({ id: z.number(), notes: z.string().max(5000) }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(lead)
        .set({ notes: input.notes, updatedAt: new Date() })
        .where(
          and(
            eq(lead.id, input.id),
            eq(lead.userId, ctx.session.user.id),
            eq(lead.unlocked, true)
          )
        );
      return { success: true };
    }),
});
