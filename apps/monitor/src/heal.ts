import { HTTP_TARGETS, RESTART_COOLDOWN_SECONDS } from "./config.js";
import type { CheckResult } from "./types.js";

const RESTART_PREFIX = "restart:";

// Auto-heal: when an HTTP check just opened an incident and its target maps to
// a Coolify resource, restart that resource once — the automated version of
// "it shows running but the site hangs; a restart fixes it". KV cooldown key
// (TTL) caps it at one attempt per resource per window so a genuinely broken
// deploy doesn't restart-loop; after that the incident stays open for a human.
// Mutates each opened check's `detail` so alerts say what was attempted.
export async function autoHeal(env: Env, opened: CheckResult[]): Promise<void> {
  for (const check of opened) {
    if (!check.id.startsWith("http:")) continue;
    const target = HTTP_TARGETS.find((t) => `http:${t.name}` === check.id);
    if (!target?.coolify) continue;

    const cooldownKey = RESTART_PREFIX + target.coolify.uuid;
    if (await env.MONITOR_KV.get(cooldownKey)) {
      check.detail = `${check.detail} — auto-restart skipped (cooldown)`;
      continue;
    }

    try {
      const res = await fetch(
        `${env.COOLIFY_URL}/api/v1/${target.coolify.type}/${target.coolify.uuid}/restart`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${env.COOLIFY_API_TOKEN}` },
          signal: AbortSignal.timeout(30_000),
        }
      );
      const body = await res.text();
      console.log(JSON.stringify({ event: "auto_restart", check: check.id, uuid: target.coolify.uuid, status: res.status }));
      if (res.ok) {
        await env.MONITOR_KV.put(cooldownKey, new Date().toISOString(), {
          expirationTtl: RESTART_COOLDOWN_SECONDS,
        });
        check.detail = `${check.detail} — 🔄 auto-restart triggered`;
      } else {
        check.detail = `${check.detail} — auto-restart failed (HTTP ${res.status}: ${body.slice(0, 100)})`;
      }
    } catch (err) {
      check.detail = `${check.detail} — auto-restart failed (${err instanceof Error ? err.message : String(err)})`;
    }
  }
}
