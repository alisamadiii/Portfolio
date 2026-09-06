import { dashboardLink, HTTP_TARGETS, HTTP_TIMEOUT_MS, type HttpTarget } from "../config.js";
import type { CheckResult } from "../types.js";

const HTTP_HINT =
  "Site not responding to real requests even if Coolify shows it running. Open the resource in Coolify → Logs. An auto-restart was already attempted (see error above for its outcome).";

async function checkOne(target: HttpTarget): Promise<CheckResult> {
  const id = `http:${target.name}`;
  const base = {
    id,
    name: target.name,
    url: target.url,
    dashboardUrl: target.coolify ? dashboardLink(target.coolify.uuid) : undefined,
  };
  const start = Date.now();
  try {
    const res = await fetch(target.url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      headers: { "user-agent": "uptime-monitor/1.0 (+cloudflare-worker)" },
    });
    // Drain the body so the connection is released cleanly.
    await res.body?.cancel();
    const latencyMs = Date.now() - start;
    const ok = res.status < 400;
    return {
      ...base,
      ok,
      detail: `HTTP ${res.status} (${target.url})`,
      httpStatus: res.status,
      latencyMs,
      hint: ok ? undefined : HTTP_HINT,
    };
  } catch (err) {
    return {
      ...base,
      ok: false,
      detail: `${err instanceof Error ? err.message : String(err)} (${target.url})`,
      latencyMs: Date.now() - start,
      hint: HTTP_HINT,
    };
  }
}

export function checkHttpTargets(): Promise<CheckResult[]> {
  return Promise.all(HTTP_TARGETS.map(checkOne));
}
