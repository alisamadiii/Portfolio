/**
 * `cms-bridge init` — the full idempotent pipeline:
 *
 *   codemod pages (extract static text, tag elements)
 *   → merge values into src/data/*.json (existing values win)
 *   → surgically merge .pages.yml (comments preserved, append-only)
 *   → ensure the astro.config integration
 *   → write the self-contained cms-report.md for whatever was skipped
 *
 * Re-running is always safe: adopted elements/keys are never touched, so a
 * second run on an unchanged project is a no-op.
 */

import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";

import { parseAstro } from "../core/astro-doc.js";
import { ensureBridgeIntegration } from "../core/config-edit.js";
import { entryFieldsFor, fieldsForObject, SEO_FIELD } from "../core/fields.js";
import {
  addAtPath,
  canAddPath,
  flattenPaths,
  getAtPath,
  readDataFile,
  writeDataFile,
} from "../core/json-store.js";
import { assignPaths } from "../core/naming.js";
import {
  ensureEntry,
  ensureLinkComponent,
  ensureMedia,
  ensurePreviewGlobal,
  ensurePreviewPath,
  entryTypeOf,
  loadPagesYml,
  savePagesYml,
} from "../core/pages-yml.js";
import { writeReport } from "../core/report.js";
import { syncDocs } from "../core/docs-sync.js";
import { transformPage } from "../core/transform.js";
import type { ContentEntry, ReportItem } from "../types.js";
import { analyzeProject } from "./check.js";

export async function initCommand(
  root: string,
  flags: { dryRun?: boolean; verbose?: boolean; yes?: boolean }
): Promise<number> {
  const dryRun = !!flags.dryRun;
  const { scan, analyses, componentItems } = await analyzeProject(root);
  const extraReports: ReportItem[] = [];

  // A malformed .pages.yml can't be merged into — bail before touching ANY
  // file, so init never leaves the project half-transformed.
  const doc = loadPagesYml(scan.pagesYml);
  const ymlParseErrors =
    "errors" in doc ? (doc as { errors: Array<{ message: string }> }).errors : [];
  if (ymlParseErrors.length > 0) {
    console.log(`${pc.bold("cms-bridge init")} — ${scan.pages.length} page(s)`);
    console.log(
      `  ${pc.red("✗")} .pages.yml has parse errors — fix them first, then re-run init:`
    );
    for (const error of ymlParseErrors) {
      console.log(`    ${pc.red("•")} ${error.message.split("\n")[0]}`);
    }
    console.log(
      `  ${pc.dim("Nothing was written. Run `cms-bridge check` for the full lint.")}`
    );
    return 1;
  }

  const siteJson = readDataFile(root, "site");
  const siteKeys = new Set(Object.keys(siteJson));

  // Resolve entry-name collisions before anything reads `page.entryName`. A
  // page whose own data import shares a name with a collection (e.g. the
  // `/blog` index backed by src/data/blog.json, alongside a `blog` collection
  // at src/data/blog/) must get its OWN file entry — merging its fields into
  // the collection leaves the page uneditable on the canvas (collections
  // aren't route-mapped). Rename the page's file entry (blog → blogPage) and
  // let the codemod repoint its data import to match.
  const isDataDir = (name: string) => {
    try {
      return fs
        .statSync(path.join(root, "src", "data", name))
        .isDirectory();
    } catch {
      return false;
    }
  };
  const usedEntryNames = new Set<string>();
  for (const { page } of analyses) {
    const name = page.entryName;
    const clashes =
      entryTypeOf(doc, name) === "collection" || isDataDir(name);
    if (!clashes) {
      usedEntryNames.add(name);
      continue;
    }
    let candidate = `${name}Page`;
    let suffix = 2;
    while (
      usedEntryNames.has(candidate) ||
      entryTypeOf(doc, candidate) !== undefined ||
      isDataDir(candidate) ||
      fs.existsSync(path.join(root, "src", "data", `${candidate}.json`))
    ) {
      candidate = `${name}Page${suffix++}`;
    }
    page.entryName = candidate;
    page.hasDataImport = false; // its data file doesn't exist yet under the new name
    usedEntryNames.add(candidate);
    extraReports.push({
      code: "R11",
      file: page.relPath,
      line: 1,
      excerpt: `Entry name "${name}" clashes with a collection — mapped to "${candidate}" instead.`,
    });
  }

  let filesChanged = 0;
  let fieldsExtracted = 0;
  const entryContents = new Map<string, Record<string, unknown>>();
  const entryDirty = new Map<string, boolean>();

  // ---- Codemod pass ------------------------------------------------------
  for (const analysis of analyses) {
    const { page } = analysis;
    const existing = readDataFile(root, page.entryName);
    // Two pages can share an entry — reuse the working copy, never re-clone.
    const content =
      entryContents.get(page.entryName) ?? structuredClone(existing);
    entryContents.set(page.entryName, content);
    entryDirty.set(page.entryName, entryDirty.get(page.entryName) ?? false);

    const taken = new Set<string>([
      ...flattenPaths(existing),
      ...siteKeys,
      ...analysis.adoptedPaths.map((adoptedPath) =>
        adoptedPath.replace(/\.\$\{[^}]*\}.*$/, "")
      ),
      ...analysis.adoptedPaths,
    ]);

    assignPaths(analysis.candidates, taken);
    const usable = analysis.candidates.filter(
      (candidate) => candidate.path && canAddPath(content, candidate.path)
    );

    const parsed = await parseAstro(page.source);
    const heroHeading = getAtPath(content, "hero.heading");
    const heroText = getAtPath(content, "hero.text");
    const result = await transformPage(page, parsed, usable, {
      wireSeo: true,
      seoSeed: {
        title: typeof heroHeading === "string" ? heroHeading : undefined,
        description: typeof heroText === "string" ? heroText : undefined,
      },
    });

    if (!result.ok) {
      extraReports.push({
        code: "R0",
        file: page.relPath,
        line: 1,
        excerpt: result.reason,
        note: "Automated transform reverted — apply the conventions manually.",
      });
      continue;
    }

    extraReports.push(...result.reports);

    for (const addition of result.additions) {
      if (addAtPath(content, addition.path, addition.value)) {
        fieldsExtracted++;
        entryDirty.set(page.entryName, true);
      }
    }

    if (result.newSource !== page.source) {
      filesChanged++;
      if (flags.verbose) {
        console.log(`  ${pc.dim("edit")} ${page.relPath}`);
      }
      if (!dryRun) fs.writeFileSync(page.filePath, result.newSource);
    }
  }

  // ---- JSON writes -------------------------------------------------------
  const jsonWritten: string[] = [];
  for (const [entryName, content] of entryContents) {
    if (!entryDirty.get(entryName)) continue;
    jsonWritten.push(`src/data/${entryName}.json`);
    if (!dryRun) writeDataFile(root, entryName, content);
  }

  // Site skeleton when missing entirely.
  const siteExists =
    fs.existsSync(path.join(root, "src", "data", "site.json")) || siteKeys.size > 0;
  let siteContent = siteJson;
  if (!siteExists) {
    siteContent = { seo: { title: "", description: "" }, name: "" };
    jsonWritten.push("src/data/site.json (skeleton — fill in business info)");
    if (!dryRun) writeDataFile(root, "site", siteContent);
  }

  // ---- .pages.yml merge --------------------------------------------------
  // Track semantic mutations: yaml re-serialization normalizes flow-map style
  // even for untouched nodes, so we only write the file when something was
  // actually added — an adopted project stays byte-identical.
  let ymlMutations = 0;
  if (ensureMedia(doc)) ymlMutations++;
  if (ensureLinkComponent(doc)) ymlMutations++;

  // Site entry first, always.
  const siteEntry: ContentEntry = {
    name: "site",
    label: "Site Settings",
    type: "file",
    path: "src/data/site.json",
    format: "json",
    fields: [SEO_FIELD, ...fieldsForObject(siteContent)],
  };
  const siteResult = ensureEntry(doc, siteEntry, { first: true });
  ymlMutations += (siteResult.created ? 1 : 0) + siteResult.fieldsAdded;
  if (ensurePreviewPath(doc, "site", "/")) ymlMutations++;
  if (ensurePreviewGlobal(doc, "site")) ymlMutations++;

  let entriesTouched = 0;
  for (const analysis of analyses) {
    const { page } = analysis;
    const content = entryContents.get(page.entryName) ?? {};
    const hasData =
      entryDirty.get(page.entryName) ||
      Object.keys(readDataFile(root, page.entryName)).length > 0 ||
      Object.keys(content).length > 0;
    if (!hasData) continue; // chrome-only page — nothing to manage yet

    const entry: ContentEntry = {
      name: page.entryName,
      label: page.entryName === "home" ? "Home" : undefined,
      type: "file",
      path: `src/data/${page.entryName}.json`,
      format: "json",
      fields: entryFieldsFor(content),
    };
    if (!entry.label) delete entry.label;
    const { created, fieldsAdded } = ensureEntry(doc, entry);
    if (created || fieldsAdded > 0) entriesTouched++;
    ymlMutations += (created ? 1 : 0) + fieldsAdded;
    if (ensurePreviewPath(doc, page.entryName, page.route)) ymlMutations++;
  }

  const ymlChanged = ymlMutations > 0;
  if (ymlChanged && !dryRun) {
    fs.writeFileSync(scan.pagesYmlPath, savePagesYml(doc));
  }

  // ---- astro.config ------------------------------------------------------
  let configResult: string = "present";
  if (scan.astroConfigPath && !scan.hasBridgeIntegration) {
    configResult = ensureBridgeIntegration(scan.astroConfigPath, { dryRun });
    if (configResult === "failed") {
      extraReports.push({
        code: "R10",
        file: path.basename(scan.astroConfigPath),
        line: 1,
        excerpt: "could not add cmsBridge() automatically",
      });
    }
  } else if (!scan.astroConfigPath) {
    extraReports.push({
      code: "R10",
      file: "astro.config.mjs",
      line: 1,
      excerpt: "no astro config found",
    });
  }

  // ---- Docs sync ---------------------------------------------------------
  const docsSync = syncDocs(root, { dryRun });

  // ---- Report ------------------------------------------------------------
  // Re-analyze AFTER the writes so the report's line numbers and item list
  // describe the files as they are now — and stay stable across re-runs.
  let itemCount =
    analyses.reduce((sum, analysis) => sum + analysis.reports.length, 0) +
    componentItems.length +
    extraReports.length;
  if (!dryRun) {
    const fresh = await analyzeProject(root);
    const written = writeReport(root, fresh.analyses, [
      ...fresh.componentItems,
      ...extraReports,
    ]);
    itemCount = written.itemCount;
  }

  // ---- Summary -----------------------------------------------------------
  const prefix = dryRun ? `${pc.bold(pc.yellow("[dry-run]"))} ` : "";
  console.log(`${prefix}${pc.bold("cms-bridge init")} — ${scan.pages.length} page(s)`);
  console.log(`  ${pc.green("✓")} ${fieldsExtracted} field(s) extracted, ${filesChanged} page(s) edited`);
  for (const file of jsonWritten) console.log(`  ${pc.green("✓")} ${file}`);
  console.log(
    `  ${pc.green("✓")} .pages.yml ${ymlChanged ? (scan.pagesYml ? "updated" : "created") : "unchanged"}${entriesTouched ? ` (${entriesTouched} entr${entriesTouched === 1 ? "y" : "ies"} touched)` : ""}`
  );
  if (configResult === "added") {
    console.log(`  ${pc.green("✓")} astro.config: cmsBridge() integration added`);
  }
  for (const report of docsSync.reports) {
    const verb =
      report.result === "unchanged"
        ? "unchanged"
        : report.result === "adopted"
          ? "adopted (markers added, notes preserved)"
          : report.result;
    const mark = report.result === "unchanged" ? pc.dim("·") : pc.green("✓");
    console.log(`  ${mark} ${report.file} ${verb}`);
  }
  if (docsSync.canonicalMissing) {
    console.log(`  ${pc.yellow("⚠")} packaged pages-cms.md not found — docs not synced`);
  }
  if (itemCount > 0) {
    console.log(`  ${pc.yellow("⚠")} ${itemCount} item(s) need review → cms-report.md`);
    console.log(`    ${pc.dim('Finish them with an AI agent: point it at cms-report.md — the file is self-contained.')}`);
  }
  if (!doc.hasIn(["settings", "baseUrl"])) {
    console.log(
      `  ${pc.yellow("⚠")} settings.baseUrl not set in .pages.yml — required for the CMS preview/canvas.`
    );
  }
  return 0;
}
