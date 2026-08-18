/**
 * The v2 three-file contract: cms.json (manifest), pages.json (page content),
 * site.json (global). Pure reads + add-only ensures — existing data ALWAYS
 * wins, nothing is ever renamed, pruned, or overwritten.
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
  name: "cms" | "pages" | "site"
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
  if (name === "site")
    return {
      seo: { title: "", description: "" },
      name: "",
      email: "",
      socials: [],
      nav: { links: [], cta: { label: "", link: "" } },
      footer: { text: "" },
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
 * Ensure src/data/ + the three contract files exist. Add-only: an existing
 * cms.json only gains missing baseline keys and NEW page entries; pages.json
 * only gains a key per manifest page; site.json is never touched once present.
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
  siteJson: Record<string, unknown>;
} {
  const created: string[] = [];
  const pagesAdded: string[] = [];

  const cmsFile = dataPath(root, "cms");
  const pagesFile = dataPath(root, "pages");
  const siteFile = dataPath(root, "site");

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

  // ---- site.json (never touched once present) ----
  let siteJson: Record<string, unknown>;
  if (fs.existsSync(siteFile)) {
    siteJson = (readJsonAt(siteFile) as Record<string, unknown>) ?? {};
  } else {
    siteJson = loadTemplate("site");
    created.push("src/data/site.json");
    if (!opts.dryRun) writeJsonObject(siteFile, siteJson);
  }

  if (!opts.dryRun && cmsDirty) {
    writeJsonObject(cmsFile, manifest as unknown as Record<string, unknown>);
  }
  // pages.json is written once by init after the codemod (add-only), so an
  // untouched project stays byte-identical.

  return { created, pagesAdded, manifest, pagesJson, siteJson };
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
