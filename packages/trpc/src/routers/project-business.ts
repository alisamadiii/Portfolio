import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/pool";
import { hubProject } from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../init";
import { isProjectOwnerOrAdmin } from "../lib/cms/authz";
import { resolveProjectRole } from "../lib/cms/project-access";
import { rebindGoogleSourceIfConnected } from "../lib/google-reviews";
import { getPlaceDetails, isAddressResult, searchPlacesLite } from "../lib/places";
import { getProjectBusiness, setProjectBusiness } from "../lib/project-business";
import {
  BUSINESS_LIMITS,
  PLACE_ID_RE,
  googleMapsUrl,
  writeReviewUrl,
} from "../lib/project-business-shared";
import { publicObjectUrl } from "../lib/r2";
import { rateLimit } from "../middleware/rate-limit";
import { parseGoogleReviewUrl } from "../lib/review-link-shared";

// Business details on hub_project (Settings › Business, Google listing).
// DB-only like agency.businessProcedure: no GitHub token, so it works on
// every project. Reads need any role; writes need the owner or an admin.
const projectProcedure = authenticatedProcedure
  .input(z.object({ projectId: z.string().uuid() }))
  .use(async ({ next, ctx, input }) => {
    const project = await db.query.hubProject.findFirst({
      where: eq(hubProject.id, input.projectId),
      columns: { id: true, githubConnectedUserId: true },
    });
    if (!project) throw new TRPCError({ code: "NOT_FOUND" });
    const role = await resolveProjectRole(ctx.session.user, {
      projectId: project.id,
      githubConnectedUserId: project.githubConnectedUserId,
    });
    if (!role) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No access to this project." });
    }
    return next({ ctx: { ...ctx, role, projectId: input.projectId } });
  });

const ownerProcedure = projectProcedure.use(async ({ next, ctx }) => {
  if (!(await isProjectOwnerOrAdmin(ctx.session.user, ctx.projectId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the site owner can change business details.",
    });
  }
  return next({ ctx });
});

// Google Places search + details are paid lookups.
const PLACES_LIMIT = { max: 5, windowMs: 10 * 60 * 1000, scope: "google-places" };

const field = (max: number) => z.string().trim().max(max).nullable().optional();

export const projectBusinessRouter = createTRPCRouter({
  get: projectProcedure.query(async ({ ctx }) => {
    const row = await getProjectBusiness(ctx.projectId);
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const { logoKey, ...business } = row;
    return {
      ...business,
      logoUrl: publicObjectUrl(logoKey),
      mapsUrl: business.googlePlaceId ? googleMapsUrl(business.googlePlaceId) : null,
      writeReviewUrl: business.googlePlaceId ? writeReviewUrl(business.googlePlaceId) : null,
      canEdit: await isProjectOwnerOrAdmin(ctx.session.user, ctx.projectId),
    };
  }),

  /** Only the keys sent change. Empty strings clear a value. */
  set: ownerProcedure
    .input(
      z.object({
        name: field(BUSINESS_LIMITS.name),
        phone: field(BUSINESS_LIMITS.phone),
        address: field(BUSINESS_LIMITS.address),
        hours: field(BUSINESS_LIMITS.hours),
        googlePlaceId: field(BUSINESS_LIMITS.googlePlaceId),
        googleReviewUrl: field(BUSINESS_LIMITS.googleReviewUrl),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { projectId: _projectId, ...patch } = input;
      if (patch.googlePlaceId && !PLACE_ID_RE.test(patch.googlePlaceId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That isn't a Google place id." });
      }
      if (patch.googleReviewUrl) {
        const url = parseGoogleReviewUrl(patch.googleReviewUrl);
        if (!url) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Paste the review link from your Google Business Profile (g.page/r/.../review).",
          });
        }
        patch.googleReviewUrl = url;
      }
      await setProjectBusiness(ctx.projectId, patch);
      if (patch.googlePlaceId) await rebindGoogleSourceIfConnected(ctx.projectId, patch.googlePlaceId);
      return { ok: true };
    }),

  /** Find the business on Google Maps. Runs on submit, never per keystroke. */
  searchPlaces: ownerProcedure
    .input(z.object({ query: z.string().trim().min(2).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await rateLimit(PLACES_LIMIT.max, PLACES_LIMIT.windowMs, PLACES_LIMIT.scope);
      const result = await searchPlacesLite(input.query);
      if (result.error) {
        console.error("[project-business] places search failed", result.error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Google Maps search failed. Try again in a moment.",
        });
      }
      // Only businesses: a street address has no Google reviews.
      return result.places
        .filter((p) => !isAddressResult(p.types))
        .map((p) => ({
          placeId: p.id,
          name: p.displayName?.text ?? "",
          address: p.formattedAddress ?? null,
        }));
    }),

  /**
   * Pick the Google listing from Settings: stores the place id and fills
   * name, address, phone and hours from Google (the owner asked for it, so
   * it replaces what was typed).
   */
  setPlace: ownerProcedure
    .input(z.object({ placeId: z.string().trim().min(1).max(300) }))
    .mutation(async ({ ctx, input }) => {
      await rateLimit(PLACES_LIMIT.max, PLACES_LIMIT.windowMs, PLACES_LIMIT.scope);
      await adoptPlace(ctx.projectId, input.placeId, { overwrite: true });
      return { ok: true };
    }),
});

/**
 * Validate the place, store its id and fill the business details from
 * Google. Apps (Feedback) fill empties only; Settings' own pick overwrites.
 */
export async function adoptPlace(projectId: string, placeId: string, opts: { overwrite?: boolean } = {}) {
  let place;
  try {
    place = await getPlaceDetails(placeId);
  } catch (error) {
    console.error("[project-business] place details failed", error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "We couldn't find that business on Google Maps.",
    });
  }
  if (isAddressResult(place.types)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That's an address, not a business listing. Pick your business from the results.",
    });
  }
  await setProjectBusiness(projectId, { googlePlaceId: place.id });
  await rebindGoogleSourceIfConnected(projectId, place.id);
  await setProjectBusiness(
    projectId,
    {
      name: place.displayName?.text ?? null,
      address: place.formattedAddress ?? null,
      phone: place.nationalPhoneNumber ?? null,
      hours: place.regularOpeningHours?.weekdayDescriptions?.join("\n") ?? null,
    },
    { onlyIfEmpty: !opts.overwrite }
  );
  return place;
}
