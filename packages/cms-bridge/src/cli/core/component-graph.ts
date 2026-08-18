/**
 * Which .astro components each page pulls in (transitively). A component used
 * by exactly one page can be codemodded into that page's data; one used by two
 * or more pages can't (it can't know whose data to read) and is reported for
 * manual `cmsPath`-prop wiring instead.
 */

import fs from "node:fs";
import path from "node:path";

import type { PageFile } from "../types.js";

export type ComponentUsage = {
  filePath: string;
  relPath: string;
  source: string;
  /** pages.json keys of every page that reaches this component. */
  pages: Set<string>;
};

/** The frontmatter block (between the first pair of `---` fences). */
function frontmatterOf(source: string): string {
  const match = source.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : "";
}

/** Relative `.astro` import specifiers in a frontmatter block. */
function astroImports(frontmatter: string): string[] {
  const specifiers: string[] = [];
  for (const match of frontmatter.matchAll(
    /from\s+["'](\.\.?\/[^"']+\.astro)["']/g
  )) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

export function buildComponentGraph(
  root: string,
  pages: PageFile[]
): Map<string, ComponentUsage> {
  const srcDir = path.join(root, "src");
  const pagesDir = path.join(srcDir, "pages");
  const usage = new Map<string, ComponentUsage>();

  const isComponentFile = (abs: string): boolean =>
    abs.startsWith(srcDir + path.sep) && !abs.startsWith(pagesDir + path.sep);

  const visit = (fromFile: string, fromSource: string, pageKey: string, seen: Set<string>) => {
    for (const specifier of astroImports(frontmatterOf(fromSource))) {
      const abs = path.resolve(path.dirname(fromFile), specifier);
      if (!isComponentFile(abs) || !fs.existsSync(abs)) continue;
      if (seen.has(abs)) continue;
      seen.add(abs);
      let source: string;
      try {
        source = fs.readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      const existing = usage.get(abs);
      if (existing) {
        existing.pages.add(pageKey);
      } else {
        usage.set(abs, {
          filePath: abs,
          relPath: path.relative(root, abs).split(path.sep).join("/"),
          source,
          pages: new Set([pageKey]),
        });
      }
      visit(abs, source, pageKey, seen);
    }
  };

  for (const page of pages) {
    visit(page.filePath, page.source, page.pageKey, new Set([page.filePath]));
  }
  return usage;
}
