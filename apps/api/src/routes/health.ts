import { Hono } from "hono";

import { runHealthChecks } from "../lib/health.js";
import type { AppEnv } from "../middleware/auth.js";

// Live deep health check — runs every dependency probe on demand. Admin-only
// (mounted under /v1/admin in app.ts): each call hits Neon, KV, SES and R2,
// so it must not be public. The public GET /health serves the latest cron
// result from KV instead.
export const health = new Hono<AppEnv>();

health.get("/", async (c) => {
  const result = await runHealthChecks(c.env);
  return c.json(result, result.ok ? 200 : 503);
});
