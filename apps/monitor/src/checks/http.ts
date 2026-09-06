import { HTTP_TARGETS, HTTP_TIMEOUT_MS } from "../config.js";
import type { CheckResult } from "../types.js";

async function checkOne(target: { name: string; url: string }): Promise<CheckResult> {
  const id = `http:${target.name}`;
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
    return {
      id,
      name: target.name,
      ok: res.status < 400,
      detail: `HTTP ${res.status} (${target.url})`,
      latencyMs,
    };
  } catch (err) {
    return {
      id,
      name: target.name,
      ok: false,
      detail: `${err instanceof Error ? err.message : String(err)} (${target.url})`,
      latencyMs: Date.now() - start,
    };
  }
}

export function checkHttpTargets(): Promise<CheckResult[]> {
  return Promise.all(HTTP_TARGETS.map(checkOne));
}
