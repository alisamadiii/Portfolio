/**
 * The v2 contract: cms.json (manifest), pages.json (page content),
 * variables.json (global values), seo.json (SEO). Pure reads + add-only
 * ensures — existing data ALWAYS wins, nothing is renamed, pruned, or
 * overwritten.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readJsonAt, writeJsonObject } from "./json-store.js";

export type CollectionField = {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  options?: string[];
  /** Image fields only: opt into the multi-image gallery widget (value is string[]). */
  multiple?: boolean | { max?: number };
};

export type CollectionDef = {
  name: string;
  label?: string;
  path: string;
  route?: string;
  fields: CollectionField[];
};

export type CmsManifest = {
  version: 1;
  baseUrl: string;
  media?: { input: string; output: string };
  pages: Record<string, { route: string; title?: string }>;
  collections: CollectionDef[];
};

export type ScannedPage = { key: string; route: string; title?: string };

const dataPath = (root: string, file: string): string =>
  path.join(root, "src", "data", `${file}.json`);

/** Trailing-slash-insensitive route match ("/about" === "/about/"). */
export function normalizeRoute(route: string): string {
  if (route === "/") return "/";
  return route.replace(/\/+$/, "");
}

/**
 * Load a placeholder template shipped in the package's `templates/` folder.
 * Works from the built CLI (`dist/cli/index.js` → `../../templates`) and from
 * source during tests (`src/cli/core/*.ts` → `../../../templates`).
 */
export function loadTemplate(
  name: "cms" | "pages" | "variables" | "seo"
): Record<string, unknown> {
  for (const relative of [
    `../../templates/${name}.json`,
    `../../../templates/${name}.json`,
  ]) {
    try {
      const candidate = fileURLToPath(new URL(relative, import.meta.url));
      if (fs.existsSync(candidate)) {
        return JSON.parse(fs.readFileSync(candidate, "utf8"));
      }
    } catch {
      // keep looking
    }
  }
  // Last-resort inline fallback (templates folder missing from the package).
  if (name === "cms")
    return {
      version: 1,
      baseUrl: "",
      media: { input: "public/media", output: "/media" },
      pages: {},
      collections: [],
    };
  if (name === "variables")
    return {
      name: "",
      logo: "",
      phone: "",
      email: "",
      address: { street: "", city: "", region: "", zip: "", mapsUrl: "" },
      socials: [],
    };
  if (name === "seo")
    return {
      site: {
        title: "",
        description: "",
        favicon: "",
        ogImage: "",
        appleTouchIcon: "",
        googleAnalytics: "",
      },
      pages: {},
    };
  return {};
}

export function readManifest(root: string): CmsManifest | null {
  const file = dataPath(root, "cms");
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as CmsManifest;
    }
  } catch {
    // malformed — caller reports it
  }
  return null;
}

/** The pages.json page key mapped to a route, if the manifest declares one. */
export function pageKeyForRoute(
  manifest: CmsManifest | null,
  route: string
): string | null {
  if (!manifest?.pages) return null;
  const want = normalizeRoute(route);
  for (const [key, page] of Object.entries(manifest.pages)) {
    if (page && typeof page.route === "string" && normalizeRoute(page.route) === want) {
      return key;
    }
  }
  return null;
}

const DEFAULTS: Record<string, unknown> = {
  string: "",
  text: "",
  select: "",
  image: "",
  file: "",
  date: "",
  boolean: false,
  number: 0,
};

/** A single blank collection item built from the collection's field defs. */
export function placeholderItem(
  fields: CollectionField[]
): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field?.name) continue;
    item[field.name] = field.type in DEFAULTS ? DEFAULTS[field.type] : "";
  }
  return item;
}

/**
 * Ensure src/data/ + the contract files exist. Add-only: an existing cms.json
 * only gains missing baseline keys and NEW page entries; pages.json only gains
 * a key per manifest page; variables.json is never touched once present.
 * Returns the in-memory documents so init can mutate + write pages.json once.
 */
export function ensureDataFiles(
  root: string,
  pages: ScannedPage[],
  opts: { dryRun?: boolean } = {}
): {
  created: string[];
  pagesAdded: string[];
  manifest: CmsManifest;
  pagesJson: Record<string, unknown>;
  variablesJson: Record<string, unknown>;
  seoJson: Record<string, unknown>;
} {
  const created: string[] = [];
  const pagesAdded: string[] = [];

  const cmsFile = dataPath(root, "cms");
  const pagesFile = dataPath(root, "pages");
  const variablesFile = dataPath(root, "variables");
  const legacySiteFile = dataPath(root, "site");
  const seoFile = dataPath(root, "seo");

  // ---- cms.json ----
  let manifest = readManifest(root);
  let cmsDirty = false;
  if (!manifest) {
    manifest = loadTemplate("cms") as CmsManifest;
    cmsDirty = true;
    created.push("src/data/cms.json");
  }
  if (manifest.version !== 1) {
    manifest.version = 1;
    cmsDirty = true;
  }
  if (!manifest.media) {
    manifest.media = { input: "public/media", output: "/media" };
    cmsDirty = true;
  }
  if (typeof manifest.baseUrl !== "string") {
    manifest.baseUrl = "";
    cmsDirty = true;
  }
  if (!manifest.pages || typeof manifest.pages !== "object") {
    manifest.pages = {};
    cmsDirty = true;
  }
  if (!Array.isArray(manifest.collections)) {
    manifest.collections = [];
    cmsDirty = true;
  }
  const claimedRoutes = new Set(
    Object.values(manifest.pages).map((p) => normalizeRoute(p.route))
  );
  for (const page of pages) {
    if (page.key in manifest.pages) continue;
    if (claimedRoutes.has(normalizeRoute(page.route))) continue; // route already mapped
    manifest.pages[page.key] = page.title
      ? { route: page.route, title: page.title }
      : { route: page.route };
    claimedRoutes.add(normalizeRoute(page.route));
    pagesAdded.push(page.key);
    cmsDirty = true;
  }

  // ---- pages.json ----
  let pagesJson: Record<string, unknown> = fs.existsSync(pagesFile)
    ? readJsonAt(pagesFile) ?? {}
    : (created.push("src/data/pages.json"), loadTemplate("pages"));
  if (!pagesJson || typeof pagesJson !== "object" || Array.isArray(pagesJson)) {
    pagesJson = {};
  }
  for (const key of Object.keys(manifest.pages)) {
    if (!(key in pagesJson)) pagesJson[key] = {};
  }

  // ---- variables.json (never touched once present) ----
  // Always ensure it exists. A legacy repo that still has the old site.json
  // is migrated: variables.json is seeded from site.json's content (globals
  // preserved) instead of a blank template. site.json is left in place — the
  // client removes it after its layout imports point at variables.json.
  let variablesJson: Record<string, unknown>;
  if (fs.existsSync(variablesFile)) {
    variablesJson = (readJsonAt(variablesFile) as Record<string, unknown>) ?? {};
  } else {
    const legacy = fs.existsSync(legacySiteFile)
      ? (readJsonAt(legacySiteFile) as Record<string, unknown> | null)
      : null;
    variablesJson =
      legacy && typeof legacy === "object" && !Array.isArray(legacy)
        ? legacy
        : loadTemplate("variables");
    created.push("src/data/variables.json");
    if (!opts.dryRun) writeJsonObject(variablesFile, variablesJson);
  }

  // ---- seo.json (add-only: create from template, stub a page slice per
  // manifest page; existing values are never modified) ----
  let seoJson: Record<string, unknown>;
  let seoDirty = false;
  if (fs.existsSync(seoFile)) {
    seoJson = (readJsonAt(seoFile) as Record<string, unknown>) ?? {};
  } else {
    seoJson = loadTemplate("seo");
    created.push("src/data/seo.json");
    seoDirty = true;
  }
  if (!seoJson.site || typeof seoJson.site !== "object") {
    seoJson.site = (loadTemplate("seo").site as Record<string, unknown>) ?? {};
    seoDirty = true;
  }
  if (!seoJson.pages || typeof seoJson.pages !== "object") {
    seoJson.pages = {};
    seoDirty = true;
  }
  const seoPages = seoJson.pages as Record<string, unknown>;
  for (const key of Object.keys(manifest.pages)) {
    if (!(key in seoPages)) {
      seoPages[key] = { title: "", description: "", ogImage: "" };
      seoDirty = true;
    }
  }

  if (!opts.dryRun && cmsDirty) {
    writeJsonObject(cmsFile, manifest as unknown as Record<string, unknown>);
  }
  if (!opts.dryRun && seoDirty) {
    writeJsonObject(seoFile, seoJson);
  }
  // pages.json is written once by init after the codemod (add-only), so an
  // untouched project stays byte-identical.

  return { created, pagesAdded, manifest, pagesJson, variablesJson, seoJson };
}

/**
 * For every array (.json-path) collection whose file is absent, create it with
 * one placeholder item. Existing files are never touched (no data loss);
 * directory/markdown collections are skipped.
 */
export function ensureCollectionFiles(
  root: string,
  manifest: CmsManifest,
  opts: { dryRun?: boolean } = {}
): { created: string[] } {
  const created: string[] = [];
  for (const collection of manifest.collections ?? []) {
    if (typeof collection?.path !== "string") continue;
    if (!collection.path.endsWith(".json")) continue; // directory/markdown → skip
    const abs = path.join(root, collection.path);
    if (fs.existsSync(abs)) continue; // never overwrite real content
    created.push(collection.path);
    if (!opts.dryRun) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const item = placeholderItem(
        Array.isArray(collection.fields) ? collection.fields : []
      );
      fs.writeFileSync(abs, `${JSON.stringify([item], null, 2)}\n`);
    }
  }
  return { created };
}
