/**
 * `cms-bridge check` — analysis only. Scans pages + components, classifies
 * everything, writes cms-report.md, lints .pages.yml structure. Exit 1 when
 * unadopted content remains (CI-friendly). Never writes anything but the
 * report.
 */

import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import YAML from "yaml";

import { parseAstro, walk, getAttr } from "../core/astro-doc.js";
import { classifyPage } from "../core/classify.js";
import {
  findPagesCmsDocs,
  isDocInSync,
  loadCanonicalDoc,
} from "../core/docs-sync.js";
import { writeReport } from "../core/report.js";
import { scanProject } from "../core/scan.js";
import type { PageAnalysis, ReportItem } from "../types.js";

/** One R5 item per component file that still holds untagged static text. */
export async function analyzeComponents(root: string): Promise<ReportItem[]> {
  const componentsDir = path.join(root, "src", "components");
  if (!fs.existsSync(componentsDir)) return [];
  const items: ReportItem[] = [];
  for (const entry of fs.readdirSync(componentsDir).sort()) {
    if (!entry.endsWith(".astro")) continue;
    const filePath = path.join(componentsDir, entry);
    const source = fs.readFileSync(filePath, "utf8");
    let untagged = 0;
    try {
      const parsed = await parseAstro(source);
      walk(parsed.ast, (node) => {
        if (node.type === "frontmatter") return false;
        if (node.type !== "element") return;
        if (getAttr(node, "data-cms-field")) return;
        const textChildren = (node.children ?? []).filter(
          (child) =>
            child.type === "text" && (child.value ?? "").trim().length > 1
        );
        const elementChildren = (node.children ?? []).filter(
          (child) => child.type === "element" || child.type === "component"
        );
        if (textChildren.length === 1 && elementChildren.length === 0) untagged++;
      });
    } catch {
      continue;
    }
    if (untagged > 0) {
      items.push({
        code: "R5",
        file: `src/components/${entry}`,
        line: 1,
        excerpt: `${untagged} untagged static text element(s)`,
        note: "Shared component — extract to site.json (bare paths) if global, or thread a cmsPath prop from pages.",
      });
    }
  }
  return items;
}

/** Structural lint of an existing .pages.yml. Returns human-readable warnings. */
export function lintPagesYml(source: string): string[] {
  const warnings: string[] = [];
  let doc: YAML.Document.Parsed;
  try {
    doc = YAML.parseDocument(source);
  } catch (error) {
    return [`.pages.yml does not parse: ${(error as Error).message}`];
  }
  for (const error of doc.errors) warnings.push(`.pages.yml: ${error.message}`);

  const config = doc.toJS() as Record<string, unknown> | null;
  if (!config || typeof config !== "object") return warnings;

  const seen = new Set<string>();
  const visitEntries = (entries: unknown, context: string) => {
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name : undefined;
      if (name) {
        if (record.type !== "group" && seen.has(name)) {
          warnings.push(`duplicate content entry name "${name}" (${context})`);
        }
        seen.add(name);
      }
      if (record.type === "group") visitEntries(record.items, `group ${name}`);
      // Recursive duplicate-field check (object/block fields nest).
      const visitFields = (fields: unknown, fieldContext: string) => {
        if (!Array.isArray(fields)) return;
        const fieldNames = new Set<string>();
        for (const field of fields as Array<Record<string, unknown>>) {
          const fieldName = typeof field?.name === "string" ? field.name : undefined;
          if (!fieldName) continue;
          if (fieldNames.has(fieldName)) {
            warnings.push(`${fieldContext}: duplicate field "${fieldName}"`);
          }
          fieldNames.add(fieldName);
          if (Array.isArray(field.fields)) {
            visitFields(field.fields, `${fieldContext} → ${fieldName}`);
          }
        }
      };
      visitFields(record.fields, `entry "${name}"`);
    }
  };
  visitEntries(config.content, "top level");

  const settings = config.settings as Record<string, unknown> | undefined;
  const preview = settings?.preview as Record<string, unknown> | undefined;
  const global = preview?.global;
  if (Array.isArray(global) && new Set(global).size !== global.length) {
    warnings.push("settings.preview.global contains duplicates");
  }
  return warnings;
}

export async function analyzeProject(root: string): Promise<{
  scan: ReturnType<typeof scanProject>;
  analyses: PageAnalysis[];
  componentItems: ReportItem[];
  lintWarnings: string[];
}> {
  const scan = scanProject(root);
  const analyses: PageAnalysis[] = [];
  for (const page of scan.pages) {
    const parsed = await parseAstro(page.source);
    analyses.push(classifyPage(page, parsed, page.source));
  }
  const componentItems = await analyzeComponents(root);
  const lintWarnings = scan.pagesYml ? lintPagesYml(scan.pagesYml) : [];
  return { scan, analyses, componentItems, lintWarnings };
}

/** Orphaned JSON keys: exist in data files but never referenced by any page. */
export function findOrphans(
  scan: ReturnType<typeof scanProject>,
  analyses: PageAnalysis[]
): string[] {
  const referenced = new Set<string>();
  for (const analysis of analyses) {
    for (const adoptedPath of analysis.adoptedPaths) {
      // Normalize template-literal indexes: features.items.${i}.name → features.items
      const normalized = adoptedPath.replace(/\.\$\{[^}]*\}.*$/, "");
      referenced.add(`${analysis.page.entryName}:${normalized.split(".")[0]}`);
    }
  }
  const orphans: string[] = [];
  const entryNames = new Set(analyses.map((analysis) => analysis.page.entryName));
  for (const [fileName, content] of scan.dataFiles) {
    if (fileName === "site") continue; // consumed by components, not pages
    if (!entryNames.has(fileName)) continue;
    for (const key of Object.keys(content)) {
      if (key === "seo") continue;
      if (!referenced.has(`${fileName}:${key}`)) {
        orphans.push(`${fileName}.json: top-level key "${key}" not referenced by any data-cms-field`);
      }
    }
  }
  return orphans;
}

export async function checkCommand(
  root: string,
  flags: { strict?: boolean }
): Promise<number> {
  const { scan, analyses, componentItems, lintWarnings } =
    await analyzeProject(root);

  const { reportPath, itemCount } = writeReport(root, analyses, componentItems);

  const candidateCount = analyses.reduce(
    (sum, analysis) => sum + analysis.candidates.length,
    0
  );
  const adoptedCount = analyses.reduce(
    (sum, analysis) => sum + analysis.adoptedPaths.length,
    0
  );

  console.log(`${pc.bold("cms-bridge check")} — ${scan.pages.length} page(s)`);
  console.log(`  ${pc.green("✓")} ${adoptedCount} field(s) already CMS-wired`);
  if (candidateCount > 0) {
    console.log(
      `  ${pc.yellow("●")} ${candidateCount} element(s) auto-extractable — run ${pc.bold("cms-bridge init")}`
    );
  }
  if (itemCount > 0) {
    console.log(
      `  ${pc.yellow("⚠")} ${itemCount} item(s) need review → ${path.basename(reportPath)}`
    );
  }
  for (const warning of lintWarnings) {
    console.log(`  ${pc.red("✗")} ${warning}`);
  }
  if (!scan.pagesYml) {
    console.log(`  ${pc.yellow("⚠")} no .pages.yml yet — init will create it`);
  }
  if (!scan.hasBridgeIntegration) {
    console.log(
      `  ${pc.yellow("⚠")} cms-bridge integration not found in astro.config — init will add it`
    );
  }

  // pages-cms.md staleness.
  const canonical = loadCanonicalDoc();
  let docsStale = 0;
  if (canonical) {
    const docs = findPagesCmsDocs(root);
    if (docs.length === 0) {
      docsStale = 1;
      console.log(
        `  ${pc.yellow("⚠")} no pages-cms.md — init will create docs/pages-cms.md`
      );
    } else {
      for (const filePath of docs) {
        const existing = fs.readFileSync(filePath, "utf8");
        if (!isDocInSync(existing, canonical)) {
          docsStale++;
          const rel = path.relative(root, filePath).split(path.sep).join("/");
          console.log(
            `  ${pc.yellow("⚠")} ${rel} out of date — run cms-bridge init`
          );
        }
      }
    }
  }

  let orphanCount = 0;
  if (flags.strict) {
    const orphans = findOrphans(scan, analyses);
    orphanCount = orphans.length;
    for (const orphan of orphans) console.log(`  ${pc.red("✗")} orphan: ${orphan}`);
  }

  const failing =
    candidateCount > 0 ||
    itemCount > 0 ||
    lintWarnings.length > 0 ||
    orphanCount > 0 ||
    docsStale > 0;
  return failing ? 1 : 0;
}
