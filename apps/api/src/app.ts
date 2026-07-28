import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import { ApiError, codeForStatus, ExpectedError } from "./lib/errors.js";
import { HEALTH_LAST_KEY, type HealthResult } from "./lib/health.js";
import { capture } from "./lib/posthog.js";
import type { AppEnv } from "./middleware/auth.js";
import { requireAdmin } from "./middleware/auth.js";
import { emailLogsRoute } from "./routes/email-logs.js";
import { emails } from "./routes/emails.js";
import { envs } from "./routes/envs.js";
import { health } from "./routes/health.js";
import { keys } from "./routes/keys.js";
import { me } from "./routes/me.js";
import { ses } from "./routes/ses.js";
import { uploads } from "./routes/uploads.js";
import { users } from "./routes/users.js";

export const app = new Hono<AppEnv>();

app.use("*", logger());
// CORS stays permissive on purpose. Preflights carry no Authorization header,
// so per-key origin reflection can't work here; the real gate is the
// server-side ORIGIN_NOT_ALLOWED check in requireAuth for users with
// allowedOrigins configured.
app.use("*", cors());

// Telemetry context only — no event is sent here. Stamps a request id (echoed
// as X-Request-Id so clients can report it) and buffers small JSON bodies so
// onError can attach them to $exception events. Errors are the only thing we
// log to PostHog.
app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  // Never buffer an env upload: the body IS a client's secrets, and a buffered
  // body is attached to $exception events, which would ship those secrets to
  // PostHog on any error. Debug these routes from the request id alone.
  const isEnvRoute = new URL(c.req.url).pathname.startsWith("/v1/admin/envs");
  if (
    !isEnvRoute &&
    (c.req.header("Content-Type") ?? "").includes("application/json")
  ) {
    try {
      const body = await c.req.raw.clone().text();
      c.set("requestBody", body.slice(0, 10_000));
    } catch {
      // Unreadable body — skip; the request itself proceeds untouched.
    }
  }
  await next();
  c.res.headers.set("X-Request-Id", c.get("requestId") ?? "");
});

app.get("/", (c) => c.json({ name: "agency-api", status: "ok" }));

// Public health: serves the latest cron result from KV (cheap — no live
// probes; those are admin-only at /v1/admin/health). "stale" means the cron
// hasn't written for >25 min (2 missed 10-min runs), i.e. the cron itself is
// the problem.
app.get("/health", async (c) => {
  const raw = await c.env.RATE_LIMIT_KV.get(HEALTH_LAST_KEY);
  if (!raw) {
    return c.json({
      status: "unknown",
      cause: "No health-cron result yet. The cron runs every 10 minutes.",
    });
  }
  const last = JSON.parse(raw) as HealthResult;
  const stale = Date.now() - Date.parse(last.timestamp) > 25 * 60 * 1000;
  const status = stale ? "stale" : last.ok ? "healthy" : "degraded";
  return c.json({ status, lastCheck: last }, last.ok && !stale ? 200 : 503);
});

// Public: any valid key (each router applies requireAuth itself). What a key
// can do comes from its user's config (bucketName/publicBaseUrl for uploads,
// emailDomain for emails).
const v1 = new Hono<AppEnv>();
v1.route("/me", me);
v1.route("/uploads", uploads);
v1.route("/emails", emails);

// Admin: one guard on the whole group — routes inside stay guard-free.
const admin = new Hono<AppEnv>();
admin.use("*", requireAdmin);
admin.route("/users", users);
admin.route("/keys", keys);
admin.route("/email-logs", emailLogsRoute);
admin.route("/envs", envs);
admin.route("/ses", ses);
admin.route("/health", health);
v1.route("/admin", admin);

app.route("/v1", v1);

app.notFound((c) =>
  c.json(
    {
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `No route for ${c.req.method} ${new URL(c.req.url).pathname}`,
        cause:
          "The path or method does not exist on this deployment. Check the Postman collection — or, if the endpoint was added recently, the deployed Worker may be behind the code (redeploy).",
      },
    },
    404
  )
);

// Every error leaves in the standard shape — { error: { code, message, cause? } }.
// All of them (expected ApiErrors included) also go to PostHog as $exception
// events so they land in Error Tracking with the user's email attached.
app.onError((err, c) => {
  // Middleware post-next code is skipped on throw, so stamp the id here too.
  c.header("X-Request-Id", c.get("requestId") ?? "");
  if (err instanceof ApiError) {
    // ExpectedError call sites capture their own (richer) telemetry.
    if (!(err instanceof ExpectedError)) {
      capture(c, "$exception", {
        $exception_list: [{ type: err.name, value: err.message }],
        status: err.status,
        error_code: err.code,
        message: err.message,
        expected: true,
        ...(err.causeHint ? { cause_hint: err.causeHint } : {}),
      });
    }
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.causeHint ? { cause: err.causeHint } : {}),
        },
      },
      err.status
    );
  }
  if (err instanceof HTTPException) {
    capture(c, "$exception", {
      $exception_list: [{ type: err.name, value: err.message }],
      status: err.status,
      error_code: codeForStatus(err.status),
      message: err.message,
      expected: true,
    });
    return c.json(
      { error: { code: codeForStatus(err.status), message: err.message } },
      err.status
    );
  }
  console.error(err);
  capture(c, "$exception", {
    $exception_list: [{ type: err.name, value: err.message }],
    status: 500,
    error_code: "INTERNAL_ERROR",
    message: err.message,
    expected: false,
    stack: err.stack,
    ...(err.cause !== undefined ? { error_cause: String(err.cause) } : {}),
  });
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: err.message || "Internal server error",
      },
    },
    500
  );
});
