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

export function readDataFile(
  root: string,
  entryName: string
): Record<string, unknown> {
  const filePath = path.join(root, "src", "data", `${entryName}.json`);
  if (!fs.existsSync(filePath)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function writeDataFile(
  root: string,
  entryName: string,
  content: Record<string, unknown>
): string {
  const dataDir = path.join(root, "src", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const filePath = path.join(dataDir, `${entryName}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(orderedForWrite(content), null, 2)}\n`);
  return filePath;
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
