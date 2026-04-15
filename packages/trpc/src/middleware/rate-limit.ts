import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { LRUCache } from "lru-cache";

const rateLimitCache = new LRUCache<string, number>({
  max: 500, // Max 500 unique IPs
  ttl: 60000, // 1 minute
});

export const getIp = async () => {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return null; // or '0.0.0.0', depends
};

/**
 * Check if an IP has exceeded the rate limit. Returns true if limited.
 * Does not throw — suitable for plain API routes.
 */
export function isRateLimited(
  ip: string,
  maxRequests = 10,
  windowMs = 60000
): boolean {
  const timeWindow = Math.floor(Date.now() / windowMs);
  const key = `${ip}:${timeWindow}`;

  const current = rateLimitCache.get(key) || 0;

  if (current >= maxRequests) return true;

  rateLimitCache.set(key, current + 1);
  return false;
}

export async function rateLimit(maxRequests = 10, windowMs = 60000) {
  const ip = (await getIp()) || "unknown";

  const timeWindow = Math.floor(Date.now() / windowMs);
  const key = `${ip}:${timeWindow}`;

  const current = rateLimitCache.get(key) || 0;

  if (current >= maxRequests) {
    const minutes = Math.round(windowMs / 60000);
    const timeLabel =
      minutes >= 60
        ? `${Math.round(minutes / 60)} hour${Math.round(minutes / 60) > 1 ? "s" : ""}`
        : `${minutes} minute${minutes > 1 ? "s" : ""}`;

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You've reached the limit of ${maxRequests} requests. Please try again in ${timeLabel}.`,
    });
  }

  rateLimitCache.set(key, current + 1);
  return true;
}
