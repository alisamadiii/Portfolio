import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { hubProject } from "@workspace/drizzle/schema";

import {
  BUSINESS_FIELD_KEYS,
  BUSINESS_LIMITS,
  type ProjectBusiness,
} from "./project-business-shared";

// Business details on hub_project. Settings writes through `set`; apps that
// learn a value (Feedback's place pick, the Google Reviews sync) write with
// onlyIfEmpty so they never overwrite what the owner typed.

export type ProjectBusinessRow = ProjectBusiness & {
  websiteUrl: string | null;
  logoKey: string | null;
};

export async function getProjectBusiness(projectId: string): Promise<ProjectBusinessRow | null> {
  const row = await db.query.hubProject.findFirst({
    where: eq(hubProject.id, projectId),
    columns: {
      name: true,
      phone: true,
      address: true,
      hours: true,
      googlePlaceId: true,
      googleReviewUrl: true,
      websiteUrl: true,
      logoKey: true,
    },
  });
  return row ?? null;
}

/** Trimmed, length-capped, empty → null. Name collapses whitespace; hours keep newlines. */
export function normalizeBusinessValue(key: keyof ProjectBusiness, value: string | null | undefined) {
  if (value == null) return null;
  const text = key === "name" ? value.replace(/\s+/g, " ").trim() : value.replace(/\r\n?/g, "\n").trim();
  return text ? text.slice(0, BUSINESS_LIMITS[key]) : null;
}

const COLUMNS = {
  name: hubProject.name,
  phone: hubProject.phone,
  address: hubProject.address,
  hours: hubProject.hours,
  googlePlaceId: hubProject.googlePlaceId,
  googleReviewUrl: hubProject.googleReviewUrl,
} as const;

/**
 * Writes the given keys only. With onlyIfEmpty, each column is set with
 * coalesce(nullif(trim(col), ''), value) in one statement, so an app filling
 * in details never races an owner's edit. A new place id drops the pasted
 * review link, which belonged to the previous business.
 */
export async function setProjectBusiness(
  projectId: string,
  patch: Partial<ProjectBusiness>,
  opts: { onlyIfEmpty?: boolean } = {}
) {
  const set: Record<string, unknown> = {};
  for (const key of BUSINESS_FIELD_KEYS) {
    if (!(key in patch)) continue;
    const value = normalizeBusinessValue(key, patch[key]);
    if (opts.onlyIfEmpty) {
      if (value == null) continue;
      const col = COLUMNS[key];
      set[key] = sql`coalesce(nullif(trim(${col}), ''), ${value})`;
    } else {
      set[key] = value;
    }
  }
  // onlyIfEmpty never replaces a place, so the link only resets on a real change.
  if ("googlePlaceId" in patch && !("googleReviewUrl" in patch) && !opts.onlyIfEmpty) {
    const next = normalizeBusinessValue("googlePlaceId", patch.googlePlaceId);
    set.googleReviewUrl = sql`case when ${hubProject.googlePlaceId} is distinct from ${next} then null else ${hubProject.googleReviewUrl} end`;
  }
  if (Object.keys(set).length === 0) return;
  await db.update(hubProject).set(set).where(eq(hubProject.id, projectId));
}
