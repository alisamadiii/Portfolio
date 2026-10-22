import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { agencyAdsCache } from "@workspace/drizzle/schema";

const MINUTE = 60 * 1000;
export const ADS_TTL = { live: 15 * MINUTE, past: 6 * 60 * MINUTE } as const;

/** 15 min for ranges that still change (include today), 6 h for finished ones. */
export const ttlForRange = (to: string) =>
  to >= new Date().toISOString().slice(0, 10) ? ADS_TTL.live : ADS_TTL.past;

/**
 * Google Ads API responses shared across viewers and server instances, so a
 * dashboard costs API operations once per TTL instead of once per page view.
 * A cache read or write failing never fails the request.
 */
export async function cachedAds<T>(
  customerId: string,
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const where = and(eq(agencyAdsCache.customerId, customerId), eq(agencyAdsCache.key, key));

  const hit = await db
    .select({ data: agencyAdsCache.data, fetchedAt: agencyAdsCache.fetchedAt })
    .from(agencyAdsCache)
    .where(where)
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => undefined);
  if (hit && Date.now() - hit.fetchedAt.getTime() < ttlMs) return hit.data as T;

  const data = await fetcher();
  await db
    .insert(agencyAdsCache)
    .values({ customerId, key, data, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: [agencyAdsCache.customerId, agencyAdsCache.key],
      set: { data, fetchedAt: new Date() },
    })
    .catch((error) => console.error("Ads cache write failed", error));
  return data;
}
