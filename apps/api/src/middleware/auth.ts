// API-key auth. A key belongs to a user; what the key can do is whatever its
// user is configured for. requireAuth loads both in one joined query and
// stamps last_used_at. requireAdmin additionally checks user.type === "admin".
import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { createMiddleware } from "hono/factory";

import { createDb } from "../db/index.js";
import { apiKeys, users, type ApiKey, type User } from "../db/schema.js";
import type { Env } from "../env.js";
import { ApiError, ExpectedError } from "../lib/errors.js";
import { hashKey, keyTypeFromPrefix } from "../lib/keys.js";
import { KvRateStore } from "../lib/kv-rate-store.js";
import { originAllowed } from "../lib/origins.js";
import { capture, type TelemetryVars } from "../lib/posthog.js";

export type AuthVars = { apiKey: ApiKey; user: User };

// Hono env for routers that run behind requireAuth/requireAdmin.
export type AppEnv = { Bindings: Env; Variables: AuthVars & TelemetryVars };

// Keys may be embedded in browsers, so cap every key per minute. KV counters
// are eventually consistent — approximate limiting is fine for abuse
// throttling. Skipped on wrangler dev like contactLimiter.
const keyLimiter: MiddlewareHandler<AppEnv> = (c, next) =>
  rateLimiter<AppEnv>({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: "draft-6",
    skip: (c) => {
      const host = new URL(c.req.url).hostname;
      return host === "localhost" || host === "127.0.0.1";
    },
    keyGenerator: (c) => `key:${c.get("apiKey").id}`,
    store: new KvRateStore(c.env.RATE_LIMIT_KV),
    handler: () => {
      throw new ApiError(
        429,
        "RATE_LIMIT_EXCEEDED",
        "Too many requests from this API key. Try again shortly.",
        "Keys allow 60 requests per minute each."
      );
    },
  })(c, next);

// Require a valid, unrevoked key. Sets `apiKey` and `user` on the context.
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new ApiError(
      401,
      "MISSING_API_KEY",
      "Missing API key.",
      'Send your key as a header: "Authorization: Bearer ak_pub_...". In Postman, set the apiKey variable once on the collection or environment.'
    );
  }

  const keyHash = await hashKey(token);
  const db = createDb(c.env);
  const [row] = await db
    .select({ apiKey: apiKeys, user: users })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!row) {
    throw new ApiError(
      401,
      "UNKNOWN_API_KEY",
      "Unknown API key.",
      "The key does not match any issued key. Check for typos or ask an admin to look it up via /v1/admin/users/lookup."
    );
  }
  if (row.apiKey.revokedAt) {
    throw new ApiError(
      401,
      "API_KEY_REVOKED",
      "This API key has been revoked.",
      "Ask an admin to issue a new key for your user."
    );
  }

  // Set before the origin check so a denial's telemetry resolves the user.
  c.set("apiKey", row.apiKey);
  c.set("user", row.user);

  const isServerKey = keyTypeFromPrefix(row.apiKey.prefix) === "server";
  if (row.user.type !== "admin" && !isServerKey) {
    const origin = c.req.header("Origin");
    if (!originAllowed(origin, row.user.allowedOrigins)) {
      // The client-facing error is deliberately vague: don't teach whoever
      // holds the key (it's embedded in client websites) that an origin
      // allowlist exists or how to satisfy it. The real cause goes to
      // PostHog here — ExpectedError skips the generic onError capture.
      const detail =
        row.user.allowedOrigins.length === 0
          ? `No allowedOrigins configured for user ${row.user.email}.`
          : !origin
            ? "Request has no Origin header (server-side caller, non-admin user)."
            : `Origin "${origin}" not in allowedOrigins [${row.user.allowedOrigins.join(", ")}].`;
      capture(c, "$exception", {
        $exception_list: [{ type: "ApiError", value: detail }],
        status: 403,
        error_code: "ACCESS_DENIED",
        message: detail,
        expected: true,
      });
      throw new ExpectedError(403, "ACCESS_DENIED", "Access denied.");
    }
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.apiKey.id));

  await keyLimiter(c, next);
});

// Require the key's user to be an admin. Runs requireAuth first, so it can be
// used alone on the /v1/admin router.
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  await requireAuth(c, async () => {
    if (c.get("user").type !== "admin") {
      throw new ApiError(
        403,
        "ADMIN_REQUIRED",
        "This endpoint requires an admin API key.",
        'Your key is valid but its user has type "user". Only keys owned by an admin-type user can call /v1/admin/*.'
      );
    }
    await next();
  });
});
