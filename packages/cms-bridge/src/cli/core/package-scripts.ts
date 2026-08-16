/**
 * Append run-script shortcuts to the consumer's package.json. Append-only:
 * existing keys always win (never overwritten), nothing else is touched, and
 * the file's own indentation + trailing-newline style is preserved.
 */

import fs from "node:fs";
import path from "node:path";

type ScriptEntry = { key: string; command: string };

export type EnsureScriptsResult = {
  added: string[];
  skipped: string[];
  result: "written" | "unchanged" | "missing";
};

/** Indent string from the first indented line; falls back to two spaces. */
function detectIndent(raw: string): string | number {
  const match = raw.match(/\n([ \t]+)\S/);
  if (!match) return 2;
  const indent = match[1];
  return indent.includes("\t") ? "\t" : indent.length;
}

export function ensurePackageScripts(
  root: string,
  entries: ScriptEntry[],
  opts: { dryRun?: boolean } = {}
): EnsureScriptsResult {
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { added: [], skipped: [], result: "missing" };
  }

  const raw = fs.readFileSync(pkgPath, "utf8");
  let pkg: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { added: [], skipped: [], result: "missing" };
    }
    pkg = parsed as Record<string, unknown>;
  } catch {
    return { added: [], skipped: [], result: "missing" };
  }

  const existing =
    pkg.scripts && typeof pkg.scripts === "object" && !Array.isArray(pkg.scripts)
      ? (pkg.scripts as Record<string, string>)
      : {};
  const scripts: Record<string, string> = { ...existing };

  const added: string[] = [];
  const skipped: string[] = [];
  for (const { key, command } of entries) {
    if (key in scripts) {
      skipped.push(key);
      continue;
    }
    scripts[key] = command;
    added.push(key);
  }

  if (added.length === 0) {
    return { added, skipped, result: "unchanged" };
  }

  if (!opts.dryRun) {
    pkg.scripts = scripts;
    const indent = detectIndent(raw);
    const trailingNewline = raw.endsWith("\n");
    fs.writeFileSync(
      pkgPath,
      `${JSON.stringify(pkg, null, indent)}${trailingNewline ? "\n" : ""}`
    );
  }

  return { added, skipped, result: "written" };
}
