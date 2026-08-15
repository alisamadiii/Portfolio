/**
 * Sync the canonical `pages-cms.md` (shipped in the package) into a client
 * project. The project may keep it anywhere (docs/, marketing/docs/, …), so we
 * find every copy by name and update each.
 *
 * The canonical content is wrapped in managed-region markers. Anything outside
 * the markers — project-specific notes like a "This site's content model"
 * section — is preserved verbatim across syncs. A legacy file with no markers
 * is adopted: its content model section is lifted out and kept, the rest is
 * replaced by the managed block.
 */

import fs from "node:fs";
import path from "node:path";

import { loadPackagedDoc } from "./report.js";

export const MANAGED_START =
  "<!-- cms-bridge:managed:start — synced from @alisamadiillc/cms-bridge. Do NOT edit inside this block; edit the package and re-run `npx cms-bridge init`. Project-specific notes go OUTSIDE the markers. -->";
export const MANAGED_END = "<!-- cms-bridge:managed:end -->";

const DOC_NAME = "pages-cms.md";

export type DocSyncResult = "created" | "updated" | "adopted" | "unchanged" | "missing-canonical";

export function loadCanonicalDoc(): string | null {
  return loadPackagedDoc(DOC_NAME);
}

/** The full managed block (markers + canonical), trailing newline included. */
function managedBlock(canonical: string): string {
  return `${MANAGED_START}\n\n${canonical.trimEnd()}\n\n${MANAGED_END}`;
}

/** Find every `pages-cms.md` under the project (skips node_modules/dot-dirs). */
export function findPagesCmsDocs(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.toLowerCase() === DOC_NAME) out.push(full);
    }
  };
  walk(root);
  return out.sort();
}

/**
 * Extract a preservable "site content model" section from a legacy (marker-
 * free) doc: a heading like `## This site's content model …` through the next
 * `## ` heading or `---` rule. Returns null when absent.
 */
export function extractContentModelSection(source: string): string | null {
  const lines = source.split("\n");
  const startIndex = lines.findIndex((line) =>
    /^##\s+.*content model/i.test(line)
  );
  if (startIndex === -1) return null;
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i]) || /^---\s*$/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }
  return lines.slice(startIndex, endIndex).join("\n").trimEnd();
}

/** Compose the final file text: managed block, plus any preserved trailer. */
function compose(canonical: string, preserved: string | null): string {
  let out = managedBlock(canonical);
  if (preserved) out += `\n\n---\n\n${preserved}\n`;
  else out += "\n";
  return out;
}

/**
 * Replace the managed block inside an existing marked file, preserving
 * everything before the start marker and after the end marker.
 */
function replaceManagedBlock(existing: string, canonical: string): string {
  const startAt = existing.indexOf(MANAGED_START);
  const endAt = existing.indexOf(MANAGED_END);
  if (startAt === -1 || endAt === -1 || endAt < startAt) {
    return compose(canonical, extractContentModelSection(existing));
  }
  const before = existing.slice(0, startAt);
  const after = existing.slice(endAt + MANAGED_END.length);
  return `${before}${managedBlock(canonical)}${after}`;
}

/** True when the file already carries the current canonical managed block. */
export function isDocInSync(existing: string, canonical: string): boolean {
  return (
    existing.includes(MANAGED_START) &&
    replaceManagedBlock(existing, canonical) === existing
  );
}

/** Sync one file path. Returns what happened and the next content. */
export function planDocSync(
  existing: string | null,
  canonical: string
): { result: DocSyncResult; content: string } {
  if (existing === null) {
    return { result: "created", content: compose(canonical, null) };
  }
  if (existing.includes(MANAGED_START)) {
    const next = replaceManagedBlock(existing, canonical);
    return { result: next === existing ? "unchanged" : "updated", content: next };
  }
  // Legacy file — adopt: preserve its content-model section, add markers.
  const next = compose(canonical, extractContentModelSection(existing));
  return { result: "adopted", content: next };
}

export type DocSyncReport = {
  file: string;
  result: DocSyncResult;
};

/**
 * Sync every `pages-cms.md` in the project. When none exists, create
 * `docs/pages-cms.md`. Writes only on change; `dryRun` computes results
 * without writing.
 */
export function syncDocs(
  root: string,
  options?: { dryRun?: boolean }
): { canonicalMissing: boolean; reports: DocSyncReport[] } {
  const canonical = loadCanonicalDoc();
  if (!canonical) return { canonicalMissing: true, reports: [] };

  const found = findPagesCmsDocs(root);
  const targets =
    found.length > 0 ? found : [path.join(root, "docs", DOC_NAME)];
  const reports: DocSyncReport[] = [];

  for (const filePath of targets) {
    const existing = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : null;
    const { result, content } = planDocSync(existing, canonical);
    reports.push({
      file: path.relative(root, filePath).split(path.sep).join("/"),
      result,
    });
    if (!options?.dryRun && result !== "unchanged") {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }
  }

  return { canonicalMissing: false, reports };
}
