import type { Env } from "./env.js";
import { renderHealthAlertEmail } from "./lib/health-template.js";
import {
  HEALTH_INCIDENT_KEY,
  HEALTH_LAST_KEY,
  runHealthChecks,
  type HealthResult,
} from "./lib/health.js";
import { captureSystem } from "./lib/posthog.js";
import { sendViaSes } from "./lib/ses.js";

// Health cron (see wrangler.toml [triggers]). Every run: deep-check all
// dependencies, store the result in KV for GET /health, and alert ONCE per
// incident — one email + PostHog $exception when checks go red, one email when
// they recover. No alert repetition while an outage is ongoing.

function failureSummary(result: HealthResult): string {
  return Object.entries(result.checks)
    .filter(([, c]) => !c.ok)
    .map(([name, c]) => `${name}: ${c.error ?? "failed"}`)
    .join("; ");
}

// Alert sender must stay on an SES-verified domain (alisamadii.com is).
const HEALTH_ALERT_FROM = "Agency API <alerts@alisamadii.com>";
const HEALTH_ALERT_TO = "agency@alisamadii.com";

async function sendAlertEmail(
  env: Env,
  subject: string,
  body: { html: string; text: string }
): Promise<void> {
  try {
    await sendViaSes(env, {
      from: HEALTH_ALERT_FROM,
      to: [HEALTH_ALERT_TO],
      subject,
      html: body.html,
      text: body.text,
    });
  } catch (err) {
    // SES itself may be the failing dependency — the PostHog event already
    // carries the details, so a failed alert email must not crash the cron.
    console.error("health alert email failed:", err);
  }
}

export async function scheduled(
  _controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  // includeDb: false — the DB probe is skipped so the cron never wakes Neon's
  // auto-suspending compute (warm compute-time is billed). Real DB failures
  // surface on live request paths instead.
  const result = await runHealthChecks(env, { includeDb: false });

  await env.RATE_LIMIT_KV.put(HEALTH_LAST_KEY, JSON.stringify(result));

  const openIncident = await env.RATE_LIMIT_KV.get(HEALTH_INCIDENT_KEY);

  if (!result.ok && !openIncident) {
    // Transition healthy → down: open the incident and alert once.
    await env.RATE_LIMIT_KV.put(HEALTH_INCIDENT_KEY, result.timestamp);
    const summary = failureSummary(result);
    await captureSystem(env, "$exception", {
      $exception_list: [{ type: "HealthCheckFailed", value: summary }],
      error_code: "HEALTH_CHECK_FAILED",
      message: summary,
      expected: true,
      checks: result.checks,
    });
    await sendAlertEmail(
      env,
      "🔴 agency-api health check failed",
      renderHealthAlertEmail({ kind: "down", result })
    );
  } else if (result.ok && openIncident) {
    // Transition down → healthy: close the incident and send the all-clear.
    await env.RATE_LIMIT_KV.delete(HEALTH_INCIDENT_KEY);
    await captureSystem(env, "health_recovered", {
      down_since: openIncident,
      recovered_at: result.timestamp,
    });
    await sendAlertEmail(
      env,
      "🟢 agency-api recovered",
      renderHealthAlertEmail({
        kind: "recovered",
        result,
        downSince: openIncident,
      })
    );
  }
}
