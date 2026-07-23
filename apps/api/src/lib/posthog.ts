// PostHog telemetry over plain HTTP — no SDK. Every capture is fire-and-forget
// via executionCtx.waitUntil and fully silent on failure: telemetry must never
// block, break, or slow down an API response.
import type { Context } from "hono";

import type { Env } from "../env.js";
import type { AppEnv } from "../middleware/auth.js";

const POSTHOG_HOST = "https://us.i.posthog.com";

// Capture outside a request (the health cron in scheduled.ts) — no Hono
// context exists there, so this takes env directly and awaits the send.
export async function captureSystem(
  env: Env,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    if (!env.POSTHOG_API_KEY) return;
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.POSTHOG_API_KEY,
        event,
        distinct_id: "system:health-cron",
        timestamp: new Date().toISOString(),
        properties: { $lib: "Agency-API", ...properties },
      }),
    });
  } catch {
    // Telemetry is best-effort; never surface its failures.
  }
}

// Per-request debug context stamped by the tracking middleware in app.ts.
export type TelemetryVars = {
  requestId?: string;
  requestBody?: string;
};

// Send one event to PostHog. No-op when POSTHOG_API_KEY is unset. The
// distinct_id is the authenticated user's email so events group per client;
// unauthenticated requests fall back to the caller's IP.
export function capture(
  c: Context<AppEnv>,
  event: string,
  properties: Record<string, unknown> = {}
): void {
  try {
    const apiKey = c.env.POSTHOG_API_KEY;
    if (!apiKey) return;

    const user = c.get("user");
    const key = c.get("apiKey");
    const ip =
      c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For");
    const origin = c.req.header("Origin");
    const referer = c.req.header("Referer");
    const url = new URL(c.req.url);
    const cf = (c.req.raw as { cf?: { colo?: string; country?: string } }).cf;

    // The client website's hostname — browsers always send Origin on
    // cross-origin calls, so this is where the API was called from.
    let domain: string | undefined;
    try {
      const source = origin ?? referer;
      if (source) domain = new URL(source).hostname;
    } catch {
      // Malformed header — leave domain unset.
    }

    const payload = {
      api_key: apiKey,
      event,
      distinct_id: user?.email ?? `anon:${ip ?? "unknown"}`,
      timestamp: new Date().toISOString(),
      properties: {
        $lib: "Agency-API",
        ...(domain ? { domain } : {}),
        // $ip makes PostHog geolocate the actual caller. Without it, GeoIP
        // runs on the Worker's egress IP — same Cloudflare location for all.
        ...(ip ? { $ip: ip } : {}),
        request: {
          id: c.get("requestId"),
          path: url.pathname,
          method: c.req.method,
          query: url.search || undefined,
          // Request body only on errors — that's where it earns its size.
          ...(event === "$exception" && c.get("requestBody")
            ? { body: c.get("requestBody") }
            : {}),
        },
        network: {
          origin,
          referer,
          ip,
          user_agent: c.req.header("User-Agent"),
          colo: cf?.colo,
          country: cf?.country,
        },
        ...(user
          ? {
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                type: user.type,
                ...(key ? { api_key_prefix: key.prefix } : {}),
              },
              // Person profile in PostHog shows the client's email/name.
              $set: { email: user.email, name: user.name, type: user.type },
            }
          : {}),
        ...properties,
      },
    };

    const send = fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(
      () => {},
      () => {}
    );

    // Outside Workers (e.g. tests) executionCtx throws — the outer catch
    // swallows it and the event is simply dropped.
    c.executionCtx.waitUntil(send);
  } catch {
    // Telemetry is best-effort; never surface its failures.
  }
}
