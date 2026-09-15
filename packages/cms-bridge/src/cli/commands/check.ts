/**
 * `cms-bridge check` — validates the v2 contract and reports any markup that
 * still needs wiring. Never writes anything.
 * Exit 1 when the contract has errors or un-wired content remains (CI-friendly).
 *
 * Reads the current combined layout (root `_site.json` = { cms, seo, variables }
 * + root `_pages.json`, collections under `_collections/`) or the legacy
 * `src/data/*.json` files as a fallback:
 *
 *  - cms (_site.json) shape (version, baseUrl, pages)
 *  - every manifest page has a _pages.json object (and vice versa)
 *  - page top-level keys don't collide with variables keys
 *  - array collections (a top-level `_collections/*.json`) hold an array of objects
 *  - every static field path (data-cms-field / component `field` prop) resolves
 *    into _pages.json or the variables bag
 */

import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";

import { analyzeProject } from "../core/analyze.js";
import { parseAstro } from "../core/astro-doc.js";
import { classifyPage } from "../core/classify.js";
import { countReportItems } from "../core/report.js";
import { bindCandidatePaths } from "../../auto/bind.js";
import { loadClaims } from "../../auto/claims.js";
import { discoverContract } from "../../auto/contract.js";

const COMPONENTS_MODULE = "@alisamadiillc/cms-bridge/components";

const readJson = (file: string): any => JSON.parse(fs.readFileSync(file, "utf8"));

const resolvePath = (values: unknown, fieldPath: string): boolean => {
  let cursor: any = values;
  for (const segment of fieldPath.split(".")) {
    if (cursor === null || typeof cursor !== "object") return false;
    const key = /^\d+$/.test(segment) ? parseInt(segment, 10) : segment;
    cursor = cursor[key];
    if (cursor === undefined) return false;
  }
  return true;
};

/** All static field paths in src/ (data-cms-field + bridge `field` props). */
function collectStaticFields(root: string): Map<string, string[]> {
  const byFile = new Map<string, string[]>();
  const visit = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) visit(full);
      else if (/\.(astro|tsx|jsx)$/.test(name)) {
        const source = fs.readFileSync(full, "utf8");
        const fields: string[] = [];
        for (const match of source.matchAll(
          /data-cms-field=(?:"([^"$]+)"|'([^'$]+)')/g
        )) {
          const value = match[1] ?? match[2];
          if (value && !value.includes("${")) fields.push(value);
        }
        // Bridge component `field` props, but only in files that import them.
        if (source.includes(COMPONENTS_MODULE)) {
          for (const match of source.matchAll(/\bfield=(?:"([^"$]+)"|'([^'$]+)')/g)) {
            const value = match[1] ?? match[2];
            if (value && !value.includes("${")) fields.push(value);
          }
        }
        if (fields.length) byFile.set(path.relative(root, full), fields);
      }
    }
  };
  const src = path.join(root, "src");
  if (fs.existsSync(src)) visit(src);
  return byFile;
}

export function checkContract(root: string): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Combined layout (current): one root _site.json ({ cms, seo, variables }) +
  // root _pages.json, collections under _collections/. Legacy layout: four files
  // under src/data. Prefer combined, fall back to legacy so un-migrated repos
  // still validate.
  const siteFile = path.join(root, "_site.json");
  const combined = fs.existsSync(siteFile);

  let manifest: any;
  let pages: Record<string, any> = {};
  let variables: Record<string, any> = {};

  if (combined) {
    let site: any;
    try {
      site = readJson(siteFile);
    } catch (error: any) {
      return { errors: [`_site.json does not parse: ${error?.message}`], warnings };
    }
    manifest = site.cms && typeof site.cms === "object" ? site.cms : {};
    variables =
      site.variables && typeof site.variables === "object"
        ? site.variables
        : {};
    try {
      pages = readJson(path.join(root, "_pages.json"));
    } catch (error: any) {
      errors.push(`_pages.json does not parse or is missing: ${error?.message}`);
    }
    if (!site.cms || typeof site.cms !== "object")
      errors.push(`_site.json: "cms" object is required.`);
  } else {
    const cmsFile = path.join(root, "src/data/cms.json");
    if (!fs.existsSync(cmsFile)) {
      return {
        errors: [
          "No _site.json (root) or src/data/cms.json found — run `cms-bridge init` first.",
        ],
        warnings,
      };
    }
    try {
      manifest = readJson(cmsFile);
    } catch (error: any) {
      return { errors: [`cms.json does not parse: ${error?.message}`], warnings };
    }
    try {
      pages = readJson(path.join(root, "src/data/pages.json"));
    } catch (error: any) {
      errors.push(`pages.json does not parse or is missing: ${error?.message}`);
    }
    try {
      variables = readJson(path.join(root, "src/data/variables.json"));
    } catch {
      warnings.push(`variables.json missing — global fields won't resolve.`);
    }
  }

  const cmsLabel = combined ? "_site.json (cms)" : "cms.json";
  const pagesLabel = combined ? "_pages.json" : "pages.json";
  const varsLabel = combined ? "_site.json (variables)" : "variables.json";
  // version 2 = FLAT contract: _pages.json is one flat global map, no
  // per-page objects to validate.
  const flat = combined && manifest.version === 2;
  if (manifest.version !== 1 && !flat)
    errors.push(`${cmsLabel}: "version" must be 1 or 2.`);
  if (typeof manifest.baseUrl !== "string" || !manifest.baseUrl)
    errors.push(`${cmsLabel}: "baseUrl" is required.`);
  const manifestPages: Record<string, any> =
    manifest.pages && typeof manifest.pages === "object" ? manifest.pages : {};
  for (const [name, page] of Object.entries(manifestPages)) {
    if (typeof page?.route !== "string")
      errors.push(`${cmsLabel}: pages.${name} is missing "route".`);
  }

  if (!flat) {
    for (const name of Object.keys(manifestPages))
      if (!(name in pages))
        errors.push(`${pagesLabel}: no "${name}" object (declared in ${cmsLabel}).`);
    for (const name of Object.keys(pages))
      if (!(name in manifestPages))
        warnings.push(
          `${pagesLabel}: "${name}" has no ${cmsLabel} route — it won't appear on the canvas.`
        );
  }

  const variablesKeys = new Set(Object.keys(variables));
  if (flat) {
    for (const key of Object.keys(pages)) {
      if (variablesKeys.has(key))
        warnings.push(
          `Key collision: "${key}" shadows ${varsLabel} "${key}".`
        );
    }
  } else {
    for (const [name, values] of Object.entries(pages)) {
      if (!values || typeof values !== "object") continue;
      for (const key of Object.keys(values)) {
        if (key === "seo") continue;
        if (variablesKeys.has(key))
          warnings.push(
            `Key collision: "${name}.${key}" shadows ${varsLabel} "${key}" on that page.`
          );
      }
    }
  }

  // Collections are AUTO-DISCOVERED from _collections/ (not declared in
  // _site.json): each subfolder is a directory collection whose entry fields are
  // inferred from the JSON (nothing to validate here); each top-level `.json`
  // file is an array collection and must hold a JSON array of objects.
  const collectionsDir = path.join(root, "_collections");
  if (fs.existsSync(collectionsDir)) {
    for (const child of fs.readdirSync(collectionsDir, { withFileTypes: true })) {
      if (!child.isFile() || !child.name.endsWith(".json")) continue;
      const rel = `_collections/${child.name}`;
      let data: unknown;
      try {
        data = readJson(path.join(collectionsDir, child.name));
      } catch {
        errors.push(`Collection file "${rel}" is not valid JSON.`);
        continue;
      }
      if (!Array.isArray(data)) {
        errors.push(`Collection file "${rel}" must hold a JSON array.`);
        continue;
      }
      data.forEach((item: any, index: number) => {
        if (!item || typeof item !== "object" || Array.isArray(item))
          warnings.push(`${rel}[${index}] is not an object.`);
      });
    }
  }

  // Static field paths must resolve into some page object or the variables bag.
  const pageObjects = Object.values(pages);
  for (const [file, fields] of collectStaticFields(root)) {
    for (const field of fields) {
      const inPages = pageObjects.some((values) => resolvePath(values, field));
      if (!inPages && !resolvePath(variables, field))
        warnings.push(
          `${file}: field "${field}" resolves to no value in ${pagesLabel} or ${varsLabel}.`
        );
    }
  }

  return { errors, warnings };
}

/** Auto mode enabled in the astro config? (`cmsBridge({ auto: true })`). */
function detectAutoMode(root: string): boolean {
  for (const name of ["astro.config.mjs", "astro.config.ts", "astro.config.js"]) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    return /cmsBridge\s*\(\s*\{[^)]*\bauto\s*:\s*true/.test(source);
  }
  return false;
}

export async function checkCommand(
  root: string,
  options: { auto?: boolean } = {}
): Promise<number> {
  const { errors, warnings } = checkContract(root);
  const autoMode = options.auto || detectAutoMode(root);
  const projectContract = discoverContract(root);

  // Un-wired markup still needing review (expression-driven text, loops, etc.).
  const { scan, analyses } = await analyzeProject(root, {
    wireChrome: autoMode && projectContract.flat,
  });
  const adoptedCount = analyses.reduce((sum, a) => sum + a.adoptedPaths.length, 0);
  const itemCount = countReportItems(analyses);

  // Auto mode: the build transform wires plain-HTML candidates itself. Run the
  // same key assignment (adopted-only taken set — key-stability invariant) and
  // surface generated keys that aren't seeded in the pages JSON yet.
  let autoCount = 0;
  const autoWarnings: string[] = [];
  if (autoMode) {
    const contract = projectContract;
    // Contract-aware pages read (scan.pagesJson is legacy-only).
    const combinedPagesFile = path.join(root, "_pages.json");
    const pagesJson: Record<string, unknown> =
      fs.existsSync(path.join(root, "_site.json")) &&
      fs.existsSync(combinedPagesFile)
        ? (() => {
            try {
              return readJson(combinedPagesFile);
            } catch {
              return {};
            }
          })()
        : scan.pagesJson;

    // Flat contract: components/layouts are in scope too — classify every
    // non-page src .astro file and append it to the analyses list.
    if (contract.flat) {
      const srcDir = path.join(root, "src");
      const pagesPrefix = path.join(srcDir, "pages") + path.sep;
      const extras = fs.existsSync(srcDir)
        ? fs
            .readdirSync(srcDir, { recursive: true, encoding: "utf8" })
            .map((name) => path.join(srcDir, name))
            .filter(
              (file) =>
                file.endsWith(".astro") &&
                !file.startsWith(pagesPrefix) &&
                !file.includes("[")
            )
        : [];
      for (const file of extras) {
        const source = fs.readFileSync(file, "utf8");
        try {
          const parsed = await parseAstro(source);
          if (parsed.diagnosticCount > 0) continue;
          const relPath = path.relative(root, file);
          analyses.push(
            classifyPage(
              { filePath: file, relPath, route: "/", pageKey: "", contentIdent: "content", hasPagesBinding: false, source },
              parsed,
              source,
              { wireChrome: true }
            )
          );
        } catch {
          // unparseable component — ignore, the build will warn
        }
      }
    }

    // Same binding as the build: persisted ownership from _fields.json
    // scopes the ordinal fallback per file, exactly like the transform.
    const persisted = contract.flat ? loadClaims(root) : new Map();
    const sessionClaims = new Set<string>();
    for (const analysis of analyses) {
      const pageValues = contract.flat
        ? pagesJson
        : ((pagesJson[analysis.page.pageKey] ?? {}) as Record<string, unknown>);
      bindCandidatePaths(analysis, pageValues, {
        legacy: !contract.flat,
        externalClaims: contract.flat ? sessionClaims : undefined,
        ownClaims: contract.flat
          ? (persisted.get(analysis.page.relPath) ?? new Set())
          : undefined,
      });
      if (contract.flat) {
        for (const candidate of analysis.candidates) {
          if (candidate.path) sessionClaims.add(candidate.path);
        }
      }
      let unseeded = 0;
      for (const candidate of analysis.candidates) {
        if (!candidate.path) {
          unseeded++;
          continue;
        }
        autoCount++;
        const seeded =
          resolvePath(pageValues, candidate.path) ||
          (candidate.role === "image" &&
            resolvePath(pageValues, `${candidate.path}Alt`));
        if (!seeded) {
          autoWarnings.push(
            `${analysis.page.relPath}: key "${candidate.path}" not seeded — run dev/build locally and commit the pages JSON.`
          );
        }
      }
      if (unseeded > 0) {
        autoWarnings.push(
          `${analysis.page.relPath}: ${unseeded} element(s) not seeded yet — run dev/build locally and commit the pages JSON.`
        );
      }
    }
  }

  console.log(`${pc.bold("cms-bridge check")} — ${analyses.length} page(s)`);
  for (const error of errors) console.log(`  ${pc.red("✗")} ${error}`);
  for (const warning of warnings) console.log(`  ${pc.yellow("⚠")} ${warning}`);
  console.log(`  ${pc.green("✓")} ${adoptedCount} field(s) CMS-wired`);
  if (autoMode) {
    console.log(`  ${pc.green("✓")} ${autoCount} field(s) auto-wired`);
    for (const warning of autoWarnings) console.log(`  ${pc.yellow("⚠")} ${warning}`);
  }
  if (itemCount > 0)
    console.log(
      `  ${pc.yellow("⚠")} ${itemCount} item(s) need manual review`
    );
  if (errors.length === 0 && itemCount === 0)
    console.log(`  ${pc.green("✓")} contract clean, nothing left to wire.`);

  return errors.length > 0 || itemCount > 0 ? 1 : 0;
}
