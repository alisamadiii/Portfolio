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

export async function rateLimit(maxRequests = 10, windowMs = 60000) {
  const ip = (await getIp()) || "unknown";

  const timeWindow = Math.floor(Date.now() / windowMs);
  const key = `${ip}:${timeWindow}`;

  const current = rateLimitCache.get(key) || 0;

  if (current >= maxRequests) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
    });
  }

  rateLimitCache.set(key, current + 1);
  return true;
}
