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
import { countReportItems } from "../core/report.js";

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
  if (manifest.version !== 1) errors.push(`${cmsLabel}: "version" must be 1.`);
  if (typeof manifest.baseUrl !== "string" || !manifest.baseUrl)
    errors.push(`${cmsLabel}: "baseUrl" is required.`);
  const manifestPages: Record<string, any> =
    manifest.pages && typeof manifest.pages === "object" ? manifest.pages : {};
  for (const [name, page] of Object.entries(manifestPages)) {
    if (typeof page?.route !== "string")
      errors.push(`${cmsLabel}: pages.${name} is missing "route".`);
  }

  for (const name of Object.keys(manifestPages))
    if (!(name in pages))
      errors.push(`${pagesLabel}: no "${name}" object (declared in ${cmsLabel}).`);
  for (const name of Object.keys(pages))
    if (!(name in manifestPages))
      warnings.push(
        `${pagesLabel}: "${name}" has no ${cmsLabel} route — it won't appear on the canvas.`
      );

  const variablesKeys = new Set(Object.keys(variables));
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

export async function checkCommand(root: string): Promise<number> {
  const { errors, warnings } = checkContract(root);

  // Un-wired markup still needing review (expression-driven text, loops, etc.).
  const { analyses } = await analyzeProject(root);
  const adoptedCount = analyses.reduce((sum, a) => sum + a.adoptedPaths.length, 0);
  const itemCount = countReportItems(analyses);

  console.log(`${pc.bold("cms-bridge check")} — ${analyses.length} page(s)`);
  for (const error of errors) console.log(`  ${pc.red("✗")} ${error}`);
  for (const warning of warnings) console.log(`  ${pc.yellow("⚠")} ${warning}`);
  console.log(`  ${pc.green("✓")} ${adoptedCount} field(s) CMS-wired`);
  if (itemCount > 0)
    console.log(
      `  ${pc.yellow("⚠")} ${itemCount} item(s) need manual review`
    );
  if (errors.length === 0 && itemCount === 0)
    console.log(`  ${pc.green("✓")} contract clean, nothing left to wire.`);

  return errors.length > 0 || itemCount > 0 ? 1 : 0;
}
