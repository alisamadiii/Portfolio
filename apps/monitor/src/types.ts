export interface CheckResult {
  /** Stable id — KV incident keys hang off this, so renames reset incidents. */
  id: string;
  name: string;
  ok: boolean;
  /** Status/error detail shown in alerts and GET /status. */
  detail?: string;
  /** HTTP status code, when the check is an HTTP probe. */
  httpStatus?: number;
  latencyMs?: number;
  /** Public URL this check hit (or relevant console URL). */
  url?: string;
  /** Deep link to the resource in the Coolify dashboard (or provider console). */
  dashboardUrl?: string;
  /** What to try — shown in alerts as the "Fix" line. */
  hint?: string;
}

export interface MonitorResult {
  ok: boolean;
  timestamp: string;
  checks: CheckResult[];
}

export interface Recovery {
  check: CheckResult;
  downSince: string;
}
