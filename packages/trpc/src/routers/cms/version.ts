import { TRPCError } from "@trpc/server";

import { baseProcedure, createTRPCRouter } from "@workspace/trpc/init";

import { createHttpError, toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { rateLimit } from "@workspace/trpc/middleware/rate-limit";

const REPO = "pagescms/pagescms";
const PACKAGE_JSON_URL =
  "https://raw.githubusercontent.com/pagescms/pagescms/main/package.json";

// In-memory TTL replaces the route's `next: { revalidate: 3600 }` fetch cache.
const CACHE_TTL_MS = 3600 * 1000;

type VersionInfo = {
  latest: string | null;
  repository: string;
  source: "package.json";
};

let cached: { value: VersionInfo; expiresAt: number } | null = null;

/**
 * Latest upstream Pages CMS version (port of GET /api/app/version).
 * Public + rate limited; result cached in-memory for an hour.
 */
const get = baseProcedure.query(async () => {
  try {
    await rateLimit();

    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let response: Response;
    try {
      response = await fetch(PACKAGE_JSON_URL, {
        headers: { Accept: "application/json" },
      });
    } catch {
      throw createHttpError("Unable to fetch latest app version.", 500);
    }

    if (!response.ok) {
      throw createHttpError("Unable to fetch latest app version.", 502);
    }

    const pkg = (await response.json()) as { version?: string };

    const value: VersionInfo = {
      latest: pkg.version ?? null,
      repository: REPO,
      source: "package.json",
    };

    cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw toTRPCError(error);
  }
});

const versionRouter = createTRPCRouter({
  get,
});

export { versionRouter };
