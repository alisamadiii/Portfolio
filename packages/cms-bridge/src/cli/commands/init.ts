/**
 * `cms-bridge init` — the v2 onboarding scaffold (idempotent, add-only):
 *
 *   ensure src/data/{cms,pages,site}.json exist (new page keys added)
 *   → create placeholder files for array collections that have none
 *   → ensure the astro.config integration + package.json scripts
 *   → report a count of anything that still needs manual review
 *
 * Re-running is always safe: every JSON write only ADDS keys — hand-edits to
 * pages.json survive verbatim, and an untouched project stays byte-identical.
 * Wiring markup to fields is done in the canvas editor, not here.
 */

import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";

import { ensureBridgeIntegration } from "../core/config-edit.js";
import { writePagesJson } from "../core/json-store.js";
import {
  ensureCollectionFiles,
  ensureDataFiles,
  readManifest,
} from "../core/manifest.js";
import { ensurePackageScripts } from "../core/package-scripts.js";
import { scanProject } from "../core/scan.js";
import { COMMANDS, OBSOLETE_COMMANDS } from "../commands.js";
import type { ReportItem } from "../types.js";

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

  // ---- 1. Ensure the three contract files --------------------------------
  const scannedPages = scan.pages.map((page) => ({
    key: page.pageKey,
    route: page.route,
  }));
  const { created, pagesAdded, manifest, pagesJson } = ensureDataFiles(
    root,
    scannedPages,
    { dryRun }
  );

  // pages.json is returned in-memory; persist it here (add-only) whenever it
  // was just created or gained page keys, so an untouched project round-trips.
  const pagesFile = path.join(root, "src", "data", "pages.json");
  const pagesNeedsWrite =
    pagesAdded.length > 0 || created.includes("src/data/pages.json");
  if (pagesNeedsWrite && !dryRun) writePagesJson(pagesFile, pagesJson);

  // ---- 2. Collection placeholder files -----------------------------------
  const collectionFiles = ensureCollectionFiles(root, manifest, { dryRun });

  // ---- 3. astro.config ---------------------------------------------------
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

  // ---- 4. package.json scripts -------------------------------------------
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

  // ---- Summary -----------------------------------------------------------
  const itemCount = extraReports.length;
  const prefix = dryRun ? `${pc.bold(pc.yellow("[dry-run]"))} ` : "";
  console.log(`${prefix}${pc.bold("cms-bridge init")} — ${scan.pages.length} page(s)`);
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
    console.log(`  ${pc.yellow("⚠")} ${itemCount} item(s) need manual review`);
    console.log(
      `    ${pc.dim("Run cms-bridge check to see what's left, then wire it in the canvas editor.")}`
    );
  }
  if (!manifest.baseUrl) {
    console.log(
      `  ${pc.yellow("⚠")} cms.json baseUrl is empty — set it (required for the CMS preview/canvas).`
    );
  }
  return 0;
}
