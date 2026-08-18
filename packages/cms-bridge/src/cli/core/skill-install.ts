/**
 * Installs the cms-bridge skill into a consumer project at
 * `.claude/skills/cms-bridge/`: the packaged docs plus a generated SKILL.md.
 * Content-diff gated — a file is only written when its bytes change, so a
 * re-run on an unchanged project reports everything as "unchanged".
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_MD = `---
name: cms-bridge
description: Edit this site's CMS wiring — the v2 three-file contract (cms.json / pages.json / site.json), the bridge components, field-path conventions, and collections. Use when adding, renaming, or debugging CMS-editable content on this Astro site.
---

# cms-bridge

This site is wired to the cms-bridge v2 CMS. Before changing any CMS-related
markup or JSON, read:

- [pages-cms.md](pages-cms.md) — the full client-site guide (start here)
- [conventions.md](conventions.md) — the field-path contract and idempotency rules
- [collections.md](collections.md) — array vs markdown collections
- [AGENTS.md](AGENTS.md) — rules for automated agents

Hard rules: field paths are page-relative (never page-prefixed); only ADD keys,
never rename or delete existing ones; never nest one \`data-cms-field\` / \`field\`
element inside another; run \`npx cms-bridge check\` after every batch of changes.
`;

/** Locate the packaged docs folder (built CLI vs source during tests). */
function packagedDocsDir(): string | null {
  for (const relative of ["../../docs", "../../../docs"]) {
    try {
      const candidate = fileURLToPath(new URL(relative, import.meta.url));
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
}

export type SkillInstallResult = {
  written: string[];
  unchanged: string[];
  docsMissing: boolean;
};

export function installSkill(
  root: string,
  opts: { dryRun?: boolean } = {}
): SkillInstallResult {
  const written: string[] = [];
  const unchanged: string[] = [];
  const skillDir = path.join(root, ".claude", "skills", "cms-bridge");

  const putFile = (name: string, content: string) => {
    const target = path.join(skillDir, name);
    const rel = `.claude/skills/cms-bridge/${name}`;
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
    if (current === content) {
      unchanged.push(rel);
      return;
    }
    written.push(rel);
    if (!opts.dryRun) {
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(target, content);
    }
  };

  putFile("SKILL.md", SKILL_MD);

  const docsDir = packagedDocsDir();
  if (!docsDir) return { written, unchanged, docsMissing: true };
  for (const entry of fs.readdirSync(docsDir).sort()) {
    if (!entry.endsWith(".md")) continue;
    putFile(entry, fs.readFileSync(path.join(docsDir, entry), "utf8"));
  }

  return { written, unchanged, docsMissing: false };
}
