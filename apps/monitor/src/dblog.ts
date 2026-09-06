import { neon } from "@neondatabase/serverless";
import type { CheckResult } from "./types.js";

// Failing runs are persisted to the `monitor_log` table in the EmpowerHer
// Neon (usesend db) so intermittent flaps leave queryable evidence — the KV
// status key only keeps the latest run. Quiet runs are NOT logged. Table
// created 2026-09-06 via psql (bigserial id, run_at default now(), check_id,
// name, url, ok, http_status, latency_ms, detail, probes jsonb).

// newsletter.empowerher-initiative.org flaps with ~10s latency while the
// container, VPS, Traefik and Neon all look healthy. These sub-probes split
// the request path so the next flap shows WHICH hop is slow:
//   /                    redirect only (middleware, no SSR body)
//   /login               SSR page — server-side self-fetches /api/auth/providers
//   /api/auth/providers  the self-fetch target itself (next-auth route)
//   /favicon.ico         static file — pure CF → Traefik → node path, no SSR
// Timeout is 20s (double the main check) so we record HOW slow the tail gets
// instead of a flat "aborted at 10s".
const DEEP_TARGET = "https://newsletter.empowerher-initiative.org";
const DEEP_PATHS = ["/", "/login", "/api/auth/providers", "/favicon.ico"];
const DEEP_TIMEOUT_MS = 20_000;
const DEEP_CHECK_ID = "http:EmpowerHer usesend";

// The flap shows as latency hovering around the 10s timeout — a 9s "pass" is
// evidence too, so near-misses on the newsletter check also trigger logging.
const NEAR_MISS_LATENCY_MS = 5_000;

const RETENTION_DAYS = 30;

export interface DeepProbe {
  path: string;
  status: number | null;
  latencyMs: number;
  error?: string;
}

/** Log only when something is wrong: any check failing, or the newsletter
 *  check slow enough to be a near-miss. Quiet runs write nothing. */
export function shouldLogRun(checks: CheckResult[]): boolean {
  return checks.some(
    (c) =>
      !c.ok ||
      (c.id === DEEP_CHECK_ID && (c.latencyMs ?? 0) >= NEAR_MISS_LATENCY_MS)
  );
}

export function runDeepProbes(): Promise<DeepProbe[]> {
  return Promise.all(
    DEEP_PATHS.map(async (path): Promise<DeepProbe> => {
      const start = Date.now();
      try {
        const res = await fetch(DEEP_TARGET + path, {
          method: "GET",
          redirect: "manual",
          signal: AbortSignal.timeout(DEEP_TIMEOUT_MS),
          headers: { "user-agent": "uptime-monitor/1.0 (+cloudflare-worker deep-probe)" },
        });
        await res.body?.cancel();
        return { path, status: res.status, latencyMs: Date.now() - start };
      } catch (err) {
        return {
          path,
          status: null,
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );
}

/** Persist the full run snapshot (all checks, not just the failing one — the
 *  healthy siblings' timings are what rule VPS load in or out) plus the deep
 *  probes on the newsletter row. */
export async function logRunToDb(
  env: Env,
  checks: CheckResult[],
  probes: DeepProbe[]
): Promise<void> {
  const sql = neon(env.MONITOR_LOG_DB_URL);
  const rows = checks.map((c) => ({
    check_id: c.id,
    name: c.name,
    url: c.url ?? null,
    ok: c.ok,
    http_status: c.httpStatus ?? null,
    latency_ms: c.latencyMs ?? null,
    detail: c.detail ?? null,
    probes: c.id === DEEP_CHECK_ID ? probes : null,
  }));
  await sql.query(
    `insert into monitor_log (check_id, name, url, ok, http_status, latency_ms, detail, probes)
     select x.check_id, x.name, x.url, x.ok, x.http_status, x.latency_ms, x.detail, x.probes
     from jsonb_to_recordset($1::jsonb)
       as x(check_id text, name text, url text, ok boolean, http_status int, latency_ms int, detail text, probes jsonb)`,
    [JSON.stringify(rows)]
  );
  await sql.query(`delete from monitor_log where run_at < now() - interval '${RETENTION_DAYS} days'`);
}
