import { AwsClient } from "aws4fetch";
import { sql } from "drizzle-orm";

import { createDb } from "../db/index.js";
import type { Env } from "../env.js";

// Deep health checks against every dependency the API needs to serve clients:
// Neon Postgres (auth lookups), Workers KV (contact rate limiter), AWS SES
// (email sending) and R2 (uploads). Used by the cron in scheduled.ts and by
// GET /v1/admin/health for live inspection.

export type CheckResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

export type HealthResult = {
  ok: boolean;
  timestamp: string;
  checks: Record<string, CheckResult>;
};

// KV key holding the latest cron result (read by GET /health).
export const HEALTH_LAST_KEY = "health:last";
// KV flag marking an open incident, so we alert once per outage, not per run.
export const HEALTH_INCIDENT_KEY = "health:incident";

async function timed(fn: () => Promise<void>): Promise<CheckResult> {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function checkDb(env: Env): Promise<CheckResult> {
  return timed(async () => {
    await createDb(env).execute(sql`select 1`);
  });
}

function checkKv(env: Env): Promise<CheckResult> {
  return timed(async () => {
    // Write + read a probe key. KV is eventually consistent, so only the
    // calls succeeding matters — the value read back is irrelevant.
    await env.RATE_LIMIT_KV.put("health:probe", new Date().toISOString(), {
      expirationTtl: 3600,
    });
    await env.RATE_LIMIT_KV.get("health:probe");
  });
}

function checkSes(env: Env): Promise<CheckResult> {
  return timed(async () => {
    if (!env.AWS_ACCESS_KEY_VALUE || !env.AWS_SECRET_KEY_VALUE) {
      throw new Error("SES credentials not configured");
    }
    const region = env.AWS_BUCKET_ORIGIN || "us-east-1";
    const client = new AwsClient({
      accessKeyId: env.AWS_ACCESS_KEY_VALUE,
      secretAccessKey: env.AWS_SECRET_KEY_VALUE,
      service: "ses",
      region,
    });
    const res = await client.fetch(`https://email.${region}.amazonaws.com/`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        Action: "GetAccountSendingEnabled",
      }).toString(),
    });
    const xml = await res.text();
    if (!res.ok) {
      throw new Error(
        /<Message>([\s\S]*?)<\/Message>/.exec(xml)?.[1] ??
          `SES request failed (${res.status})`
      );
    }
    if (/<Enabled>(.*?)<\/Enabled>/.exec(xml)?.[1] !== "true") {
      throw new Error("SES account sending is disabled");
    }
  });
}

function checkR2(env: Env): Promise<CheckResult> {
  return timed(async () => {
    if (
      !env.R2_ENDPOINT ||
      !env.R2_ACCESS_KEY_ID ||
      !env.R2_SECRET_ACCESS_KEY
    ) {
      throw new Error("R2 credentials not configured");
    }
    const client = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto",
    });
    // ListAllMyBuckets — cheapest authenticated call that proves the
    // credentials and endpoint work.
    const res = await client.fetch(env.R2_ENDPOINT.replace(/\/+$/, "") + "/", {
      method: "GET",
    });
    if (!res.ok) {
      throw new Error(`R2 request failed (${res.status})`);
    }
  });
}

export async function runHealthChecks(env: Env): Promise<HealthResult> {
  const [db, kv, ses, r2] = await Promise.all([
    checkDb(env),
    checkKv(env),
    checkSes(env),
    checkR2(env),
  ]);
  const checks = { db, kv, ses, r2 };
  return {
    ok: Object.values(checks).every((c) => c.ok),
    timestamp: new Date().toISOString(),
    checks,
  };
}
