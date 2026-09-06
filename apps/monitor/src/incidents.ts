import type { CheckResult, Recovery } from "./types.js";

const PREFIX = "incident:";

export interface IncidentDiff {
  /** Checks that just went healthy → down (alert once). */
  opened: CheckResult[];
  /** Open incidents whose check is healthy again (send all-clear). */
  recovered: Recovery[];
}

// Per-check incident state in KV: `incident:<check-id>` = ISO timestamp when
// it opened. One alert on open, one on recovery, silence in between — same
// pattern as the old agency-api worker, but per-check so a usesend outage and
// a portfolio outage are separate incidents with separate recoveries.
export async function diffIncidents(kv: KVNamespace, checks: CheckResult[]): Promise<IncidentDiff> {
  const open = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix: PREFIX, cursor });
    for (const key of page.keys) {
      const value = await kv.get(key.name);
      if (value) open.set(key.name.slice(PREFIX.length), value);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const now = new Date().toISOString();
  const opened: CheckResult[] = [];
  const recovered: Recovery[] = [];

  for (const check of checks) {
    const downSince = open.get(check.id);
    if (!check.ok && !downSince) {
      opened.push(check);
      await kv.put(PREFIX + check.id, now);
    } else if (check.ok && downSince) {
      recovered.push({ check, downSince });
      await kv.delete(PREFIX + check.id);
    }
    open.delete(check.id);
  }

  // Leftovers = incidents for checks that no longer exist (resource deleted,
  // target renamed). Close them silently so they don't stick around forever.
  for (const staleId of open.keys()) {
    await kv.delete(PREFIX + staleId);
  }

  return { opened, recovered };
}
