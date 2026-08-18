/**
 * `cms-bridge check` — validates the v2 three-file contract and reports any
 * markup that still needs wiring. Never writes anything.
 * Exit 1 when the contract has errors or un-wired content remains (CI-friendly).
 *
 *  - cms.json shape (version, baseUrl, pages, collections)
 *  - every manifest page has a pages.json object (and vice versa)
 *  - page top-level keys don't collide with site.json keys
 *  - array collections hold an array with their required fields
 *  - every static field path (data-cms-field / component `field` prop) resolves
 *    into pages.json or site.json
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

  const cmsFile = path.join(root, "src/data/cms.json");
  if (!fs.existsSync(cmsFile)) {
    return {
      errors: ["src/data/cms.json not found — run `cms-bridge init` first."],
      warnings,
    };
  }
  let manifest: any;
  try {
    manifest = readJson(cmsFile);
  } catch (error: any) {
    return { errors: [`cms.json does not parse: ${error?.message}`], warnings };
  }

  if (manifest.version !== 1) errors.push(`cms.json: "version" must be 1.`);
  if (typeof manifest.baseUrl !== "string" || !manifest.baseUrl)
    errors.push(`cms.json: "baseUrl" is required.`);
  const manifestPages: Record<string, any> =
    manifest.pages && typeof manifest.pages === "object" ? manifest.pages : {};
  for (const [name, page] of Object.entries(manifestPages)) {
    if (typeof page?.route !== "string")
      errors.push(`cms.json: pages.${name} is missing "route".`);
  }

  let pages: Record<string, any> = {};
  try {
    pages = readJson(path.join(root, "src/data/pages.json"));
  } catch (error: any) {
    errors.push(`pages.json does not parse or is missing: ${error?.message}`);
  }
  let site: Record<string, any> = {};
  try {
    site = readJson(path.join(root, "src/data/site.json"));
  } catch {
    warnings.push(`site.json missing — global fields won't resolve.`);
  }

  for (const name of Object.keys(manifestPages))
    if (!(name in pages))
      errors.push(`pages.json: no "${name}" object (declared in cms.json).`);
  for (const name of Object.keys(pages))
    if (!(name in manifestPages))
      warnings.push(
        `pages.json: "${name}" has no cms.json route — it won't appear on the canvas.`
      );

  const siteKeys = new Set(Object.keys(site));
  for (const [name, values] of Object.entries(pages)) {
    if (!values || typeof values !== "object") continue;
    for (const key of Object.keys(values)) {
      if (key === "seo") continue;
      if (siteKeys.has(key))
        warnings.push(
          `Key collision: "${name}.${key}" shadows site.json "${key}" on that page.`
        );
    }
  }

  for (const collection of Array.isArray(manifest.collections)
    ? manifest.collections
    : []) {
    if (typeof collection?.name !== "string" || typeof collection?.path !== "string") {
      errors.push(`cms.json: every collection needs "name" and "path".`);
      continue;
    }
    const abs = path.join(root, collection.path);
    if (collection.path.endsWith(".json")) {
      if (!fs.existsSync(abs)) {
        warnings.push(
          `Collection file "${collection.path}" doesn't exist yet (created on first entry).`
        );
        continue;
      }
      let data: unknown;
      try {
        data = readJson(abs);
      } catch {
        errors.push(`Collection file "${collection.path}" is not valid JSON.`);
        continue;
      }
      if (!Array.isArray(data)) {
        errors.push(`Collection file "${collection.path}" must hold a JSON array.`);
        continue;
      }
      const required = (Array.isArray(collection.fields) ? collection.fields : [])
        .filter((field: any) => field?.required)
        .map((field: any) => field.name);
      data.forEach((item: any, index: number) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          warnings.push(`${collection.path}[${index}] is not an object.`);
          return;
        }
        for (const req of required)
          if (item[req] === undefined || item[req] === "")
            warnings.push(
              `${collection.path}[${index}] is missing required field "${req}".`
            );
      });
    } else if (!fs.existsSync(abs)) {
      warnings.push(
        `Collection folder "${collection.path}" doesn't exist yet (created on first entry).`
      );
    }
  }

  // Static field paths must resolve into some page object or site.json.
  const pageObjects = Object.values(pages);
  for (const [file, fields] of collectStaticFields(root)) {
    for (const field of fields) {
      const inPages = pageObjects.some((values) => resolvePath(values, field));
      if (!inPages && !resolvePath(site, field))
        warnings.push(
          `${file}: field "${field}" resolves to no value in pages.json or site.json.`
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
