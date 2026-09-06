import { COOLIFY_EXCLUDED_UUIDS, COOLIFY_TIMEOUT_MS, dashboardLink } from "../config.js";
import type { CheckResult } from "../types.js";

function hintForStatus(status: string): string | undefined {
  if (!status.startsWith("running")) {
    return "Container stopped. Open the resource in Coolify → hit Restart, then check Deployments for a failed deploy and Logs for the crash reason.";
  }
  return undefined;
}

interface CoolifyResource {
  uuid: string;
  name: string;
  status?: string;
}

// One check per Coolify resource. A resource is DOWN when its status doesn't
// start with "running" (e.g. "exited:unhealthy"). The health suffix is ignored
// on purpose: most resources report "running:unknown" (no container
// healthcheck configured), and "running:unhealthy" still serves traffic — the
// HTTP checks catch real user-facing breakage. The suffix still lands in
// `detail` so GET /status and alerts show it.
export async function checkCoolify(env: Env): Promise<CheckResult[]> {
  const apiCheckId = "coolify:api";
  try {
    const res = await fetch(`${env.COOLIFY_URL}/api/v1/resources`, {
      headers: { authorization: `Bearer ${env.COOLIFY_API_TOKEN}` },
      signal: AbortSignal.timeout(COOLIFY_TIMEOUT_MS),
    });
    if (!res.ok) {
      await res.body?.cancel();
      return [
        {
          id: apiCheckId,
          name: "Coolify API",
          ok: false,
          detail: `HTTP ${res.status} from ${env.COOLIFY_URL}/api/v1/resources`,
          url: env.COOLIFY_URL,
          hint: "Coolify itself isn't answering — check the Hostinger VPS (2.25.105.158) is up, then the Coolify dashboard.",
        },
      ];
    }
    const resources = (await res.json()) as CoolifyResource[];
    const checks: CheckResult[] = resources
      .filter((r) => !COOLIFY_EXCLUDED_UUIDS.has(r.uuid))
      .map((r) => {
        const status = r.status ?? "unknown";
        return {
          id: `coolify:${r.uuid}`,
          name: `${r.name} (coolify)`,
          ok: status.startsWith("running"),
          detail: status,
          dashboardUrl: dashboardLink(r.uuid),
          hint: hintForStatus(status),
        };
      });
    // The API itself responding is a check too — it proxies "VPS reachable".
    return [{ id: apiCheckId, name: "Coolify API", ok: true, detail: `${checks.length} resources` }, ...checks];
  } catch (err) {
    return [
      {
        id: apiCheckId,
        name: "Coolify API",
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
        url: env.COOLIFY_URL,
        hint: "Coolify itself isn't answering — check the Hostinger VPS (2.25.105.158) is up, then the Coolify dashboard.",
      },
    ];
  }
}
