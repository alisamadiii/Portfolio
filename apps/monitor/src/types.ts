export interface CheckResult {
  /** Stable id — KV incident keys hang off this, so renames reset incidents. */
  id: string;
  name: string;
  ok: boolean;
  /** Status/error detail shown in alerts and GET /status. */
  detail?: string;
  latencyMs?: number;
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
