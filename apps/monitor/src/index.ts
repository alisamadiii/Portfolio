import { sendDownDiscord, sendRecoveredDiscord } from "./alerts/discord.js";
import { sendDownEmail, sendRecoveredEmail } from "./alerts/email.js";
import { checkCoolify } from "./checks/coolify.js";
import { checkHttpTargets } from "./checks/http.js";
import { checkSes } from "./checks/ses.js";
import { autoHeal } from "./heal.js";
import { diffIncidents } from "./incidents.js";
import type { MonitorResult } from "./types.js";

const STATUS_KEY = "status:last";

async function runMonitor(env: Env): Promise<void> {
  const [coolify, http, ses] = await Promise.all([
    checkCoolify(env),
    checkHttpTargets(),
    checkSes(env),
  ]);
  const checks = [...coolify, ...http, ses];

  const { opened, recovered } = await diffIncidents(env.MONITOR_KV, checks);

  // Restart mapped Coolify resources for freshly failed HTTP checks BEFORE
  // alerting and BEFORE persisting status, so both the alert and GET /status
  // say whether a restart was already attempted.
  await autoHeal(env, opened);

  const result: MonitorResult = {
    ok: checks.every((c) => c.ok),
    timestamp: new Date().toISOString(),
    checks,
  };
  await env.MONITOR_KV.put(STATUS_KEY, JSON.stringify(result));

  console.log(
    JSON.stringify({
      event: "monitor_run",
      ok: result.ok,
      failing: checks.filter((c) => !c.ok).map((c) => c.id),
      opened: opened.map((c) => c.id),
      recovered: recovered.map((r) => r.check.id),
    })
  );

  // One batched alert per transition, per channel. Each channel wrapped
  // separately: SES may be the thing that's down, Discord is the backup path
  // (and vice-versa) — a failed alert must not kill the run.
  const alerts: Promise<void>[] = [];
  if (opened.length > 0) {
    alerts.push(
      sendDownDiscord(env, opened).catch((err) => console.error("discord down alert failed:", err)),
      sendDownEmail(env, opened).catch((err) => console.error("email down alert failed:", err))
    );
  }
  if (recovered.length > 0) {
    alerts.push(
      sendRecoveredDiscord(env, recovered).catch((err) => console.error("discord recovery alert failed:", err)),
      sendRecoveredEmail(env, recovered).catch((err) => console.error("email recovery alert failed:", err))
    );
  }
  await Promise.all(alerts);
}

export default {
  async scheduled(_controller, env, _ctx): Promise<void> {
    await runMonitor(env);
  },

  // GET /status — last cron result as JSON (read-only, nothing secret in it).
  async fetch(request, env, _ctx): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/status") {
      const last = await env.MONITOR_KV.get(STATUS_KEY);
      if (!last) {
        return Response.json({ error: "no run recorded yet" }, { status: 404 });
      }
      return new Response(last, { headers: { "content-type": "application/json" } });
    }
    return Response.json({ error: "not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
