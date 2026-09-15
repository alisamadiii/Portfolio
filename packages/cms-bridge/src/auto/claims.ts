/**
 * Persistent key ownership for the flat contract: root `_fields.json` maps
 * each source file (repo-relative) to the pages-JSON keys its elements bound.
 *
 * Why it must be persisted (and committed): binding is recomputed every
 * build. When the hub edits a value between dev sessions, the element's
 * literal no longer equals the JSON value, so value-matching fails — the
 * ordinal fallback must know which keys the file OWNS to rebind safely.
 * Without persistence a cold build would mint a duplicate key and the hub
 * edit would never render. Cross-file scoping also rides on this map: a
 * file can never bind another file's keys.
 *
 * Machine-owned, like _pages.json — never hand-edit. Self-pruning: every
 * transform replaces its file's entry with the exact keys it bound.
 */

import fs from "node:fs";
import path from "node:path";

export const FIELDS_FILE = "_fields.json";

export type ClaimsMap = Map<string, Set<string>>;

export function loadClaims(root: string): ClaimsMap {
  const claims: ClaimsMap = new Map();
  try {
    const raw = fs.readFileSync(path.join(root, FIELDS_FILE), "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [file, keys] of Object.entries(parsed)) {
      if (Array.isArray(keys)) {
        claims.set(file, new Set(keys.filter((k) => typeof k === "string")));
      }
    }
  } catch {
    // missing/invalid — start empty, first build rewrites it
  }
  return claims;
}

/** Serialize + write (sorted for stable diffs). Prunes files that no longer exist. */
export function saveClaims(
  root: string,
  claims: ClaimsMap,
  warn: (message: string) => void
): void {
  const out: Record<string, string[]> = {};
  for (const file of [...claims.keys()].sort()) {
    if (!fs.existsSync(path.join(root, file))) continue; // deleted file
    const keys = [...(claims.get(file) ?? [])];
    if (keys.length > 0) out[file] = keys;
  }
  const serialized = `${JSON.stringify(out, null, 2)}\n`;
  const target = path.join(root, FIELDS_FILE);
  try {
    const before = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
    if (before === serialized) return;
    fs.writeFileSync(target, serialized);
  } catch (error) {
    warn(
      `[cms-bridge auto] could not write ${FIELDS_FILE}: ${error instanceof Error ? error.message : error}`
    );
  }
}
