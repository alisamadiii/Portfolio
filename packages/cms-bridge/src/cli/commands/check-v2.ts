/**
 * `cms-bridge check` for v2 projects (cms.json present). Validates the
 * three-file contract instead of the legacy `.pages.yml` lints:
 *
 *  - cms.json shape (version, baseUrl, pages, collections)
 *  - every manifest page has a pages.json object (and vice versa)
 *  - page top-level keys don't collide with site.json keys (resolution is
 *    page-first, a collision shadows the site value)
 *  - every static `data-cms-field` in src/ resolves into pages.json or
 *    site.json (dynamic template-literal paths are skipped)
 */

import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";

type CheckResult = { errors: string[]; warnings: string[] };

const readJson = (file: string): any =>
  JSON.parse(fs.readFileSync(file, "utf8"));

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

/** All static data-cms-field values in src/ (skips `${…}` template paths). */
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
        if (fields.length) byFile.set(path.relative(root, full), fields);
      }
    }
  };
  const src = path.join(root, "src");
  if (fs.existsSync(src)) visit(src);
  return byFile;
}

export function checkV2(root: string): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let manifest: any;
  try {
    manifest = readJson(path.join(root, "src/data/cms.json"));
  } catch (error: any) {
    return { errors: [`cms.json does not parse: ${error?.message}`], warnings };
  }
  if (manifest.version !== 1) errors.push(`cms.json: "version" must be 1.`);
  if (typeof manifest.baseUrl !== "string" || !manifest.baseUrl)
    errors.push(`cms.json: "baseUrl" is required.`);
  const manifestPages: Record<string, any> =
    manifest.pages && typeof manifest.pages === "object" ? manifest.pages : {};
  if (Object.keys(manifestPages).length === 0)
    errors.push(`cms.json: "pages" must declare at least one page.`);
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

  for (const name of Object.keys(manifestPages)) {
    if (!(name in pages))
      errors.push(`pages.json: no "${name}" object (declared in cms.json).`);
  }
  for (const name of Object.keys(pages)) {
    if (!(name in manifestPages))
      warnings.push(
        `pages.json: "${name}" has no cms.json route — it won't appear on the canvas.`
      );
  }

  // Page-first resolution: a page top-level key that also exists in site.json
  // shadows the global value for frames on that route.
  const siteKeys = new Set(Object.keys(site));
  for (const [name, values] of Object.entries(pages)) {
    if (!values || typeof values !== "object") continue;
    for (const key of Object.keys(values)) {
      // `seo` is convention on BOTH levels — page seo intentionally shadows
      // the site default; never a collision.
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
    // A `.json` path is an ARRAY collection (single file = [ {item}, … ]);
    // anything else is a DIRECTORY collection (one file per entry).
    if (collection.path.endsWith(".json")) {
      if (!fs.existsSync(abs)) {
        warnings.push(
          `Collection file "${collection.path}" doesn't exist yet (created on first entry).`
        );
      } else {
        let data: unknown;
        try {
          data = readJson(abs);
        } catch {
          errors.push(`Collection file "${collection.path}" is not valid JSON.`);
          continue;
        }
        if (!Array.isArray(data)) {
          errors.push(
            `Collection file "${collection.path}" must hold a JSON array.`
          );
          continue;
        }
        const required = (
          Array.isArray(collection.fields) ? collection.fields : []
        )
          .filter((field: any) => field?.required)
          .map((field: any) => field.name);
        data.forEach((item: any, index: number) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            warnings.push(
              `${collection.path}[${index}] is not an object.`
            );
            return;
          }
          for (const name of required) {
            if (item[name] === undefined || item[name] === "")
              warnings.push(
                `${collection.path}[${index}] is missing required field "${name}".`
              );
          }
        });
      }
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
      const inSite = resolvePath(site, field);
      if (!inPages && !inSite)
        warnings.push(
          `${file}: data-cms-field "${field}" resolves to no value in pages.json or site.json.`
        );
    }
  }

  return { errors, warnings };
}

export function runCheckV2(root: string): number {
  const { errors, warnings } = checkV2(root);
  console.log(pc.bold("cms-bridge check") + " — v2 contract (cms.json)");
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`  ${pc.green("✓")} cms.json, pages.json and site.json all check out.`);
    return 0;
  }
  for (const error of errors) console.log(`  ${pc.red("✗")} ${error}`);
  for (const warning of warnings) console.log(`  ${pc.yellow("⚠")} ${warning}`);
  return errors.length > 0 ? 1 : 0;
}
