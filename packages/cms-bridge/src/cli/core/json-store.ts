/**
 * src/data/*.json read/merge/write. Merge contract: existing values ALWAYS
 * win; keys are only added, never modified or deleted. Stable ordering:
 * `seo` first, everything else in insertion order.
 */

import fs from "node:fs";
import path from "node:path";

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
