import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { lead, leadScan } from "@workspace/drizzle/schema";
import type { LeadStatus } from "@workspace/drizzle/schema";

import { adminProcedure, createTRPCRouter } from "../init";
import {
  distanceMiles,
  isSocialOnly,
  isWebsiteDead,
  searchPlaces,
} from "../lib/places";

// Home base for near-me scans (566 Kit St, Jacksonville FL 32216).
const HOME = {
  lat: 30.3048973,
  lng: -81.5660117,
  city: "Jacksonville",
  state: "FL",
  radiusMeters: 15_000, // bias circle ~9 mi
  maxMiles: 12, // hard cutoff — close enough to drive to
};

// Google Places Enterprise SKU free tier. Scans are blocked before the
// month's counted calls could cross this — nothing ever gets billed.
const FREE_TIER_CALLS = 1000;
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

export const leadsRouter = createTRPCRouter({
  scan: createTRPCRouter({
    run: adminProcedure
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
      .mutation(async ({ input }) => {
        // Hard stop before the free tier can be crossed — a scan may use up
        // to CALLS_PER_SCAN requests, so reserve that much headroom.
        const used = await monthApiCalls();
        if (used + CALLS_PER_SCAN > FREE_TIER_CALLS) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Free tier exhausted: ${used}/${FREE_TIER_CALLS} calls used this month. Resets on the 1st.`,
          });
        }

        const city = input.nearMe ? HOME.city : input.city!;
        const state = input.nearMe ? HOME.state : input.state!;
        const query = input.nearMe
          ? input.niche
          : `${input.niche} in ${city}, ${state}`;

        const [scan] = await db
          .insert(leadScan)
          .values({ query: input.niche, city, state, nearMe: input.nearMe })
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

          let noWebsiteCount = 0;
          for (const c of classified) {
            const noWebsite = !c.website;
            if (noWebsite || c.socialOnly || c.websiteDead) noWebsiteCount++;

            const values = {
              scanId: scan.id,
              placeId: c.place.id,
              name: c.place.displayName?.text ?? "Unknown",
              address: c.place.formattedAddress ?? null,
              phone: c.place.nationalPhoneNumber ?? null,
              website: c.website,
              socialOnly: c.socialOnly,
              websiteDead: c.websiteDead,
              distanceMiles:
                input.nearMe && c.place.location?.latitude !== undefined
                  ? Math.round(
                      distanceMiles(HOME, {
                        lat: c.place.location.latitude!,
                        lng: c.place.location.longitude!,
                      }) * 10
                    ) / 10
                  : null,
              rating: c.place.rating ?? null,
              reviewCount: c.place.userRatingCount ?? 0,
              mapsUrl: c.place.googleMapsUri ?? null,
              category:
                c.place.primaryTypeDisplayName?.text ??
                c.place.types?.[0] ??
                null,
              score: scoreLead({
                noWebsite,
                socialOnly: c.socialOnly,
                websiteDead: c.websiteDead,
                phone: !!c.place.nationalPhoneNumber,
                rating: c.place.rating ?? null,
                reviewCount: c.place.userRatingCount ?? 0,
              }),
            };

            // Re-scans refresh place data but keep status/notes.
            await db
              .insert(lead)
              .values(values)
              .onConflictDoUpdate({
                target: lead.placeId,
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

          return { scanId: scan.id, totalFound: operational.length, noWebsiteCount };
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

    list: adminProcedure.query(async () => {
      const scans = await db
        .select()
        .from(leadScan)
        .orderBy(desc(leadScan.createdAt))
        .limit(50);

      const used = await monthApiCalls();

      return {
        scans,
        monthApiCalls: used,
        freeTier: FREE_TIER_CALLS,
        scansLeft: Math.max(
          0,
          Math.floor((FREE_TIER_CALLS - used) / CALLS_PER_SCAN)
        ),
      };
    }),

    get: adminProcedure
      .input(z.object({ scanId: z.number() }))
      .query(async ({ input }) => {
        const [scan] = await db
          .select()
          .from(leadScan)
          .where(eq(leadScan.id, input.scanId))
          .limit(1);
        return scan ?? null;
      }),
  }),

  list: adminProcedure
    .input(
      z.object({
        scanId: z.number(),
        noWebsiteOnly: z.boolean().default(true),
        status: z.enum(LEAD_STATUSES).optional(),
        minRating: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const filters = [eq(lead.scanId, input.scanId)];
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
        .where(eq(leadScan.id, input.scanId))
        .limit(1);

      return db
        .select()
        .from(lead)
        .where(and(...filters))
        .orderBy(
          // Near-me scans: closest first — the whole point is driving over.
          ...(scan?.nearMe
            ? [sql`${lead.distanceMiles} asc nulls last`, desc(lead.score)]
            : [desc(lead.score), desc(lead.reviewCount)])
        );
    }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(LEAD_STATUSES) }))
    .mutation(async ({ input }) => {
      await db
        .update(lead)
        .set({ status: input.status as LeadStatus, updatedAt: new Date() })
        .where(eq(lead.id, input.id));
      return { success: true };
    }),

  updateNotes: adminProcedure
    .input(z.object({ id: z.number(), notes: z.string().max(5000) }))
    .mutation(async ({ input }) => {
      await db
        .update(lead)
        .set({ notes: input.notes, updatedAt: new Date() })
        .where(eq(lead.id, input.id));
      return { success: true };
    }),
});
