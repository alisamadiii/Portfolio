import { COOLIFY_EXCLUDED_UUIDS, COOLIFY_TIMEOUT_MS } from "../config.js";
import type { CheckResult } from "../types.js";

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
      },
    ];
  }
}
