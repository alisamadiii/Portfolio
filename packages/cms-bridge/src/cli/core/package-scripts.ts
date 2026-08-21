/**
 * Sync the `cms:*` run-scripts in the consumer's package.json. A key is ADDED
 * when absent; UPDATED only when its current value is a known-stale form we
 * generated (never a hand-edited value); and REMOVED (obsolete keys) only when
 * its value matches a form we generated. The file's indentation + trailing
 * newline are preserved.
 *
 * Scripts use `npx @alisamadiillc/cms-bridge <cmd>` — the scoped name works
 * whether or not the package is a local dependency (npx runs the package's
 * single bin). Plain `npx cms-bridge` would 404 (unscoped name isn't ours),
 * and the bare `cms-bridge` bin breaks when the package isn't installed.
 */

import fs from "node:fs";
import path from "node:path";

type ScriptEntry = { key: string; command: string; replaces?: string[] };
type RemoveEntry = { key: string; values: string[] };

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
  opts: { dryRun?: boolean; remove?: RemoveEntry[] } = {}
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
  let changed = 0;
  for (const { key, command, replaces } of entries) {
    if (!(key in scripts)) {
      scripts[key] = command;
      added.push(key);
      changed++;
      continue;
    }
    if (scripts[key] === command) {
      skipped.push(key);
      continue;
    }
    // Present with a different value — only overwrite a stale form we generated.
    if ((replaces ?? []).includes(scripts[key])) {
      scripts[key] = command;
      added.push(key);
      changed++;
    } else {
      skipped.push(key); // hand-edited — leave it alone
    }
  }

  // Remove obsolete self-owned scripts, only when the value is one we generated.
  for (const { key, values } of opts.remove ?? []) {
    if (key in scripts && values.includes(scripts[key])) {
      delete scripts[key];
      changed++;
    }
  }

  if (changed === 0) {
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
