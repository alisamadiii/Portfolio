/**
 * Project discovery for the v2 contract: pages, cms.json/pages.json/site.json,
 * astro.config. Pure reads — no writes here.
 */

import fs from "node:fs";
import path from "node:path";

import type { PageFile, ProjectScan } from "../types.js";
import { pageKeyForRoute, readManifest } from "./manifest.js";
import { readJsonAt } from "./json-store.js";
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
 * The page's binding to its pages.json object: `const <ident> = pages.<key>`
 * (or `pages["<kebab-key>"]`). Returns the identifier + the page key so
 * re-runs adopt both instead of re-deriving them.
 */
export function pageBinding(
  source: string
): { ident: string; pageKey: string } | null {
  const importMatch = source.match(
    /import\s+(\w+)\s+from\s+["'][^"']*\/data\/pages\.json["']/
  );
  if (!importMatch) return null;
  const pagesIdent = importMatch[1];
  const bindMatch = source.match(
    new RegExp(
      `(?:const|let|var)\\s+(\\w+)\\s*=\\s*${pagesIdent}(?:\\.(\\w+)|\\[["']([\\w-]+)["']\\])`
    )
  );
  if (!bindMatch) return null;
  const ident = bindMatch[1];
  const pageKey = bindMatch[2] ?? bindMatch[3];
  if (!pageKey) return null;
  return { ident, pageKey };
}

export function scanProject(root: string): ProjectScan {
  const pagesDir = path.join(root, "src", "pages");
  const dataDir = path.join(root, "src", "data");

  const manifest = readManifest(root);

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
    const binding = pageBinding(source);
    const pageKey =
      binding?.pageKey ??
      pageKeyForRoute(manifest, route) ??
      entryNameForPage(relToPages);
    pages.push({
      filePath,
      relPath: path.relative(root, filePath).split(path.sep).join("/"),
      route,
      pageKey,
      contentIdent: binding?.ident ?? "content",
      hasPagesBinding: binding !== null,
      source,
    });
  }
  pages.sort((a, b) =>
    a.route === "/" ? -1 : b.route === "/" ? 1 : a.route.localeCompare(b.route)
  );

  const pagesJson =
    (readJsonAt(path.join(dataDir, "pages.json")) as Record<string, unknown>) ??
    {};
  const siteJson =
    (readJsonAt(path.join(dataDir, "site.json")) as Record<string, unknown>) ??
    {};

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

  return {
    root,
    pages,
    manifest,
    pagesJson:
      pagesJson && typeof pagesJson === "object" && !Array.isArray(pagesJson)
        ? pagesJson
        : {},
    siteJson:
      siteJson && typeof siteJson === "object" && !Array.isArray(siteJson)
        ? siteJson
        : {},
    astroConfigPath,
    hasBridgeIntegration,
  };
}
