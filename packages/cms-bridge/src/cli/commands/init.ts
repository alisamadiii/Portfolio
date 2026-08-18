/**
 * `cms-bridge init` — the v2 onboarding pipeline (idempotent, add-only):
 *
 *   install the .claude skill (packaged docs)
 *   → ensure src/data/{cms,pages,site}.json exist
 *   → create placeholder files for array collections that have none
 *   → codemod pages + single-use components: replace plain tags with the
 *     bridge components and move their values into pages.json (existing values
 *     always win)
 *   → ensure the astro.config integration + package.json scripts
 *   → write the self-contained cms-report.md for whatever was skipped
 *
 * Re-running is always safe: adopted markup/keys are never touched, and every
 * JSON write only ADDS keys — hand-edits to pages.json survive verbatim.
 */

import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";

import { parseAstro } from "../core/astro-doc.js";
import { classifyPage } from "../core/classify.js";
import { buildComponentGraph } from "../core/component-graph.js";
import { ensureBridgeIntegration } from "../core/config-edit.js";
import { addAtPath, canAddPath, flattenPaths, getAtPath, writePagesJson } from "../core/json-store.js";
import {
  ensureCollectionFiles,
  ensureDataFiles,
  readManifest,
} from "../core/manifest.js";
import { assignPaths } from "../core/naming.js";
import { ensurePackageScripts } from "../core/package-scripts.js";
import { pageBinding, scanProject } from "../core/scan.js";
import { writeReport } from "../core/report.js";
import { transformPage } from "../core/transform.js";
import { COMMANDS, OBSOLETE_COMMANDS } from "../commands.js";
import type { PageAnalysis, PageFile, ReportItem } from "../types.js";

/** True when cms.json is present on disk but doesn't parse. */
function manifestIsMalformed(root: string): boolean {
  const file = path.join(root, "src", "data", "cms.json");
  if (!fs.existsSync(file)) return false;
  return readManifest(root) === null;
}

export async function initCommand(
  root: string,
  flags: { dryRun?: boolean; verbose?: boolean }
): Promise<number> {
  const dryRun = !!flags.dryRun;
  const extraReports: ReportItem[] = [];

  // Bail before touching anything if cms.json exists but is broken.
  if (manifestIsMalformed(root)) {
    console.log(`${pc.bold("cms-bridge init")}`);
    console.log(
      `  ${pc.red("✗")} src/data/cms.json does not parse — fix it first, then re-run init.`
    );
    return 1;
  }

  const scan = scanProject(root);

  // ---- 1. Skill install --------------------------------------------------
  const { installSkill } = await import("../core/skill-install.js");
  const skill = installSkill(root, { dryRun });

  // ---- 2/3. Ensure the three contract files ------------------------------
  const scannedPages = scan.pages.map((page) => ({
    key: page.pageKey,
    route: page.route,
  }));
  const { created, pagesAdded, manifest, pagesJson } = ensureDataFiles(
    root,
    scannedPages,
    { dryRun }
  );

  // ---- 4. Collection placeholder files -----------------------------------
  const collectionFiles = ensureCollectionFiles(root, manifest, { dryRun });

  // ---- 5. Codemod: pages + single-use components -------------------------
  const graph = buildComponentGraph(root, scan.pages);

  // Build the transform work-list. Each page is a target; each component used
  // by exactly one page becomes a target under that page's key. Components used
  // by 2+ pages can't be auto-wired (they'd need a cmsPath prop) → R5.
  const targets: { page: PageFile; analysis: PageAnalysis }[] = [];
  for (const page of scan.pages) {
    const parsed = await parseAstro(page.source);
    targets.push({ page, analysis: classifyPage(page, parsed, page.source) });
  }
  for (const usage of graph.values()) {
    if (usage.pages.size !== 1) continue; // shared → handled below as R5
    const pageKey = [...usage.pages][0];
    const binding = pageBinding(usage.source);
    const compPage: PageFile = {
      filePath: usage.filePath,
      relPath: usage.relPath,
      route: "",
      pageKey,
      contentIdent: binding?.ident ?? "content",
      hasPagesBinding: binding !== null,
      source: usage.source,
    };
    const parsed = await parseAstro(usage.source);
    targets.push({ page: compPage, analysis: classifyPage(compPage, parsed, usage.source) });
  }

  // Shared-component R5 reports.
  for (const usage of graph.values()) {
    if (usage.pages.size < 2) continue;
    const compPage: PageFile = {
      filePath: usage.filePath,
      relPath: usage.relPath,
      route: "",
      pageKey: "",
      contentIdent: "content",
      hasPagesBinding: false,
      source: usage.source,
    };
    const parsed = await parseAstro(usage.source);
    const analysis = classifyPage(compPage, parsed, usage.source);
    if (analysis.candidates.length === 0) continue;
    extraReports.push({
      code: "R5",
      file: usage.relPath,
      line: analysis.candidates[0]?.line ?? 1,
      excerpt: `${analysis.candidates.length} editable element(s) in a component used by ${usage.pages.size} pages`,
      note: `Shared by: ${[...usage.pages].join(", ")}. Thread a cmsPath prop from each page (see recipe) instead of hardcoding one page's data.`,
    });
  }

  let filesChanged = 0;
  let fieldsExtracted = 0;
  let pagesDirty = false;

  for (const { page, analysis } of targets) {
    const pageObj = ((pagesJson[page.pageKey] ??= {}) as Record<string, unknown>);

    const taken = new Set<string>([
      ...flattenPaths(pageObj),
      ...Object.keys(scan.siteJson),
      ...analysis.adoptedPaths.map((p) => p.replace(/\.\$\{[^}]*\}.*$/, "")),
      ...analysis.adoptedPaths,
    ]);

    assignPaths(analysis.candidates, taken);
    const usable = analysis.candidates.filter(
      (candidate) => candidate.path && canAddPath(pageObj, candidate.path)
    );

    const parsed = await parseAstro(page.source);
    const heroHeading = getAtPath(pageObj, "hero.heading");
    const heroText = getAtPath(pageObj, "hero.text");
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
      if (addAtPath(pageObj, addition.path, addition.value)) {
        fieldsExtracted++;
        pagesDirty = true;
      }
    }
    if (result.newSource !== page.source) {
      filesChanged++;
      if (flags.verbose) console.log(`  ${pc.dim("edit")} ${page.relPath}`);
      if (!dryRun) fs.writeFileSync(page.filePath, result.newSource);
    }
  }

  // ---- Write pages.json (once, add-only) ---------------------------------
  const pagesFile = path.join(root, "src", "data", "pages.json");
  const pagesNeedsWrite =
    pagesDirty || pagesAdded.length > 0 || created.includes("src/data/pages.json");
  if (pagesNeedsWrite && !dryRun) writePagesJson(pagesFile, pagesJson);

  // ---- 6. astro.config ---------------------------------------------------
  let configResult = "present";
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

  // ---- 7. package.json scripts -------------------------------------------
  const scriptsResult = ensurePackageScripts(
    root,
    COMMANDS.map((command) => ({
      key: `cms:${command.name}`,
      command: `cms-bridge ${command.name}`,
      // Upgrade the old `npx cms-bridge …` form (which 404s on the scoped name).
      replaces: [`npx cms-bridge ${command.name}`],
    })),
    {
      dryRun,
      remove: OBSOLETE_COMMANDS.map((name) => ({
        key: `cms:${name}`,
        values: [`npx cms-bridge ${name}`, `cms-bridge ${name}`],
      })),
    }
  );

  // ---- 8. Report ---------------------------------------------------------
  // Re-analyze AFTER the writes so line numbers describe the files as they are
  // now and stay stable across re-runs. Shared-component R5 items don't re-scan
  // (they live in components), so carry them (and R0/R10) through.
  let itemCount = 0;
  if (!dryRun) {
    const fresh = await Promise.all(
      scanProject(root).pages.map(async (page) => {
        const parsed = await parseAstro(page.source);
        return classifyPage(page, parsed, page.source);
      })
    );
    const written = writeReport(root, fresh, extraReports);
    itemCount = written.itemCount;
  } else {
    itemCount =
      targets.reduce((sum, t) => sum + t.analysis.reports.length, 0) +
      extraReports.length;
  }

  // ---- Summary -----------------------------------------------------------
  const prefix = dryRun ? `${pc.bold(pc.yellow("[dry-run]"))} ` : "";
  console.log(`${prefix}${pc.bold("cms-bridge init")} — ${scan.pages.length} page(s)`);
  console.log(
    `  ${pc.green("✓")} ${fieldsExtracted} field(s) extracted, ${filesChanged} file(s) edited`
  );
  const skillCount = skill.written.length;
  console.log(
    skillCount > 0
      ? `  ${pc.green("✓")} skill: ${skillCount} file(s) written to .claude/skills/cms-bridge/`
      : `  ${pc.dim("·")} skill: up to date`
  );
  if (skill.docsMissing) {
    console.log(`  ${pc.yellow("⚠")} packaged docs not found — skill docs not copied`);
  }
  for (const file of created) console.log(`  ${pc.green("✓")} ${file} created`);
  for (const file of collectionFiles.created)
    console.log(`  ${pc.green("✓")} ${file} (placeholder collection)`);
  if (pagesAdded.length > 0)
    console.log(`  ${pc.green("✓")} cms.json: added page(s) ${pagesAdded.join(", ")}`);
  if (configResult === "added")
    console.log(`  ${pc.green("✓")} astro.config: cmsBridge() integration added`);
  if (scriptsResult.result === "written")
    console.log(`  ${pc.green("✓")} package.json: scripts synced`);
  else if (scriptsResult.result === "unchanged")
    console.log(`  ${pc.dim("·")} package.json: scripts already present`);
  else console.log(`  ${pc.yellow("⚠")} package.json not found — scripts not added`);
  if (itemCount > 0) {
    console.log(`  ${pc.yellow("⚠")} ${itemCount} item(s) need review → cms-report.md`);
    console.log(
      `    ${pc.dim("Finish them with an AI agent: point it at cms-report.md — the file is self-contained.")}`
    );
  }
  if (!manifest.baseUrl) {
    console.log(
      `  ${pc.yellow("⚠")} cms.json baseUrl is empty — set it (required for the CMS preview/canvas).`
    );
  }
  return 0;
}
