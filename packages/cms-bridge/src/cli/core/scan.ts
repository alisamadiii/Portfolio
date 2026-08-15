/**
 * Project discovery: pages, data files, .pages.yml, astro.config, collection
 * definitions. Pure reads — no writes here.
 */

import fs from "node:fs";
import path from "node:path";

import type { PageFile, ProjectScan } from "../types.js";
import { entryNameForPage, routeForPage } from "./routes.js";

const walkDir = (dir: string, out: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, out);
    else out.push(full);
  }
  return out;
};

/**
 * The page's OWN data-entry import name. Pages typically import site.json
 * (global chrome) AND their own JSON — `site` never identifies the page, so
 * prefer the first non-site data import.
 */
export function dataImportName(source: string): string | null {
  const matches = [
    ...source.matchAll(
      /import\s+(\w+)\s+from\s+["'][^"']*\/data\/(\w[\w-]*)\.json["']/g
    ),
  ];
  const own = matches.find((match) => match[1] !== "site");
  return own?.[1] ?? null;
}

export function scanProject(root: string): ProjectScan {
  const pagesDir = path.join(root, "src", "pages");
  const dataDir = path.join(root, "src", "data");

  const pages: PageFile[] = [];
  for (const filePath of walkDir(pagesDir)) {
    if (!filePath.endsWith(".astro")) continue;
    const relToPages = path
      .relative(pagesDir, filePath)
      .split(path.sep)
      .join("/");
    const route = routeForPage(relToPages);
    if (route === null) continue; // dynamic route — out of scope
    const source = fs.readFileSync(filePath, "utf8");
    const adopted = dataImportName(source);
    pages.push({
      filePath,
      relPath: path.relative(root, filePath).split(path.sep).join("/"),
      route,
      slug: entryNameForPage(relToPages),
      entryName: adopted ?? entryNameForPage(relToPages),
      hasDataImport: adopted !== null,
      source,
    });
  }
  pages.sort((a, b) => (a.route === "/" ? -1 : b.route === "/" ? 1 : a.route.localeCompare(b.route)));

  const dataFiles = new Map<string, Record<string, unknown>>();
  if (fs.existsSync(dataDir)) {
    for (const entry of fs.readdirSync(dataDir)) {
      if (!entry.endsWith(".json")) continue;
      try {
        const parsed = JSON.parse(
          fs.readFileSync(path.join(dataDir, entry), "utf8")
        );
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          dataFiles.set(entry.replace(/\.json$/, ""), parsed);
        }
      } catch {
        // Malformed JSON is reported by the caller via check lint, not here.
      }
    }
  }

  const pagesYmlPath = path.join(root, ".pages.yml");
  const pagesYml = fs.existsSync(pagesYmlPath)
    ? fs.readFileSync(pagesYmlPath, "utf8")
    : null;

  let astroConfigPath: string | null = null;
  for (const name of ["astro.config.mjs", "astro.config.ts", "astro.config.js"]) {
    const candidate = path.join(root, name);
    if (fs.existsSync(candidate)) {
      astroConfigPath = candidate;
      break;
    }
  }
  const hasBridgeIntegration = astroConfigPath
    ? fs
        .readFileSync(astroConfigPath, "utf8")
        .includes("@alisamadiillc/cms-bridge/astro")
    : false;

  const collectionsDir = path.join(root, "cms", "collections");
  const collectionDefs = fs.existsSync(collectionsDir)
    ? fs
        .readdirSync(collectionsDir)
        .filter((entry) => /\.ya?ml$/.test(entry))
        .map((entry) => path.join(collectionsDir, entry))
        .sort()
    : [];

  return {
    root,
    pages,
    dataFiles,
    pagesYml,
    pagesYmlPath,
    astroConfigPath,
    hasBridgeIntegration,
    collectionDefs,
  };
}
