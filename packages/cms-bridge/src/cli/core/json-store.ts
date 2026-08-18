/**
 * src/data/*.json read/merge/write. Merge contract: existing values ALWAYS
 * win; keys are only added, never modified or deleted. Stable ordering:
 * `seo` first, everything else in insertion order.
 */

import fs from "node:fs";
import path from "node:path";

export function getAtPath(
  target: Record<string, unknown>,
  dotPath: string
): unknown {
  let current: unknown = target;
  for (const segment of dotPath.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * True when a path can be added without disturbing existing data: every
 * intermediate segment is absent or a plain object, and the leaf is absent.
 */
export function canAddPath(
  target: Record<string, unknown>,
  dotPath: string
): boolean {
  const segments = dotPath.split(".");
  let current: unknown = target;
  for (let i = 0; i < segments.length; i++) {
    if (current === undefined) return true;
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      return false;
    }
    const next = (current as Record<string, unknown>)[segments[i]];
    if (i === segments.length - 1) return next === undefined;
    current = next;
  }
  return true;
}

/** Set a value only when the path is not already present. Returns true if set. */
export function addAtPath(
  target: Record<string, unknown>,
  dotPath: string,
  value: unknown
): boolean {
  const segments = dotPath.split(".");
  let current: Record<string, unknown> = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const next = current[segment];
    if (next === undefined) {
      const created: Record<string, unknown> = {};
      current[segment] = created;
      current = created;
    } else if (next !== null && typeof next === "object" && !Array.isArray(next)) {
      current = next as Record<string, unknown>;
    } else {
      return false; // existing non-object in the way — existing wins
    }
  }
  const leaf = segments[segments.length - 1];
  if (leaf in current) return false;
  current[leaf] = value;
  return true;
}

/** `seo` first, rest in original insertion order. */
export function orderedForWrite(
  content: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ("seo" in content) out.seo = content.seo;
  for (const key of Object.keys(content)) {
    if (key !== "seo") out[key] = content[key];
  }
  return out;
}

/** Read + parse any JSON file. Returns null on missing/malformed. */
export function readJsonAt(absPath: string): any {
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch {
    return null;
  }
}

/** Write any JSON value verbatim (2-space, trailing newline). */
export function writeJsonObject(absPath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Write pages.json with each page object's `seo` key hoisted first. Only the
 * key ORDER is normalized — values are the same objects, so untouched pages
 * round-trip byte-equivalent across re-runs.
 */
export function writePagesJson(
  absPath: string,
  pagesJson: Record<string, unknown>
): void {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(pagesJson)) {
    out[key] =
      value && typeof value === "object" && !Array.isArray(value)
        ? orderedForWrite(value as Record<string, unknown>)
        : value;
  }
  writeJsonObject(absPath, out);
}

/** Every dot path present in a JSON object (all nesting levels). */
export function flattenPaths(
  content: Record<string, unknown>,
  prefix = ""
): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(content)) {
    const current = prefix ? `${prefix}.${key}` : key;
    paths.push(current);
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      paths.push(...flattenPaths(value as Record<string, unknown>, current));
    }
  }
  return paths;
}
