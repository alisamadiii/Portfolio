import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MANAGED_END,
  MANAGED_START,
  extractContentModelSection,
  findPagesCmsDocs,
  isDocInSync,
  loadCanonicalDoc,
  planDocSync,
  syncDocs,
} from "../src/cli/core/docs-sync.js";

const CANON = "# Canonical\n\nSome managed content.\n";

describe("planDocSync", () => {
  it("creates a marked file when none exists", () => {
    const { result, content } = planDocSync(null, CANON);
    expect(result).toBe("created");
    expect(content).toContain(MANAGED_START);
    expect(content).toContain(MANAGED_END);
    expect(content).toContain("Some managed content.");
  });

  it("updates stale managed content, preserves outside text", () => {
    const existing = `Intro note above.\n\n${MANAGED_START}\n\nOLD STALE CONTENT\n\n${MANAGED_END}\n\nTrailer note below.\n`;
    const { result, content } = planDocSync(existing, CANON);
    expect(result).toBe("updated");
    expect(content).toContain("Intro note above.");
    expect(content).toContain("Trailer note below.");
    expect(content).toContain("Some managed content.");
    expect(content).not.toContain("OLD STALE CONTENT");
  });

  it("is a no-op when already in sync", () => {
    const first = planDocSync(null, CANON).content;
    const { result, content } = planDocSync(first, CANON);
    expect(result).toBe("unchanged");
    expect(content).toBe(first);
  });

  it("adopts a legacy file and preserves its content-model section", () => {
    const legacy = `# Old doc

Some generic prose that should be dropped.

## This site's content model (Acme)

| entry | file |
| ----- | ---- |
| home  | home.json |

More project notes here.

## Other generic section

blah
`;
    const { result, content } = planDocSync(legacy, CANON);
    expect(result).toBe("adopted");
    expect(content).toContain(MANAGED_START);
    expect(content).toContain("Some managed content.");
    // preserved project section, outside the markers
    expect(content).toContain("## This site's content model (Acme)");
    expect(content).toContain("home.json");
    const afterEnd = content.slice(content.indexOf(MANAGED_END));
    expect(afterEnd).toContain("This site's content model");
    // generic prose dropped
    expect(content).not.toContain("generic prose that should be dropped");
  });
});

describe("extractContentModelSection", () => {
  it("returns null when absent", () => {
    expect(extractContentModelSection("# Doc\n\nNo model here.")).toBeNull();
  });
  it("stops at the next --- rule", () => {
    const section = extractContentModelSection(
      "## This site's content model\n\nkeep\n\n---\n\ndrop"
    );
    expect(section).toContain("keep");
    expect(section).not.toContain("drop");
  });
});

describe("isDocInSync", () => {
  it("true for freshly synced, false for stale", () => {
    const synced = planDocSync(null, CANON).content;
    expect(isDocInSync(synced, CANON)).toBe(true);
    expect(isDocInSync(synced, "# Different canonical\n")).toBe(false);
    expect(isDocInSync("no markers here", CANON)).toBe(false);
  });
});

describe("syncDocs on disk", () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "cms-docs-"));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("creates docs/pages-cms.md when project has none", () => {
    const { canonicalMissing, reports } = syncDocs(root);
    expect(canonicalMissing).toBe(false);
    expect(reports).toHaveLength(1);
    expect(reports[0].result).toBe("created");
    expect(reports[0].file).toBe("docs/pages-cms.md");
    expect(fs.existsSync(path.join(root, "docs/pages-cms.md"))).toBe(true);
  });

  it("finds and syncs a doc in a non-standard folder", () => {
    const dir = path.join(root, "marketing", "docs");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "pages-cms.md"), "legacy content\n");
    const { reports } = syncDocs(root);
    expect(reports[0].file).toBe("marketing/docs/pages-cms.md");
    expect(reports[0].result).toBe("adopted");
    const written = fs.readFileSync(path.join(dir, "pages-cms.md"), "utf8");
    expect(written).toContain(MANAGED_START);
  });

  it("second sync is unchanged", () => {
    syncDocs(root);
    const before = fs.readFileSync(path.join(root, "docs/pages-cms.md"), "utf8");
    const { reports } = syncDocs(root);
    expect(reports[0].result).toBe("unchanged");
    const after = fs.readFileSync(path.join(root, "docs/pages-cms.md"), "utf8");
    expect(after).toBe(before);
  });

  it("dry-run does not write", () => {
    const { reports } = syncDocs(root, { dryRun: true });
    expect(reports[0].result).toBe("created");
    expect(fs.existsSync(path.join(root, "docs/pages-cms.md"))).toBe(false);
  });
});

describe("packaged canonical doc", () => {
  it("loads and contains the site-name SEO section", () => {
    const canonical = loadCanonicalDoc();
    expect(canonical).not.toBeNull();
    expect(canonical!).toContain("Site name in search results");
    expect(canonical!).toContain("application-name");
    // Bearded Pig project section must NOT be in the canonical source
    expect(canonical!).not.toContain("Bearded Pig");
  });

  it("finds no docs in an empty dir", () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "cms-empty-"));
    expect(findPagesCmsDocs(empty)).toEqual([]);
    fs.rmSync(empty, { recursive: true, force: true });
  });
});
